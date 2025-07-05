import { EventClassification, ConflictDetection, AIRecommendation, SmartSchedule, AutomatedReminder, ProductivityInsights, SmartFeaturesConfig } from '../types/smart-features-types';
import { GoogleCalendarEvent } from '../types/google-calendar-types';
import { logger } from '../utils/logger';

export class SmartFeaturesService {
  private config: SmartFeaturesConfig;

  constructor() {
    this.config = {
      enableClassification: true,
      enableConflictDetection: true,
      enableAIRecommendations: true,
      enableAutomatedReminders: true,
      enableProductivityInsights: true,
      classificationThreshold: 0.7,
      conflictDetectionRange: 30, // 30 minutes
      reminderDefaults: {
        preparation: 60,
        travel: 30,
        followUp: 15
      }
    };
  }

  /**
   * 이벤트 분류 - 제목과 설명을 기반으로 카테고리와 우선순위를 자동 분류
   */
  async classifyEvent(event: GoogleCalendarEvent): Promise<EventClassification> {
    try {
      const title = event.summary?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      const location = event.location?.toLowerCase() || '';
      
      // 키워드 기반 분류
      const keywords = {
        work: ['회의', '미팅', '프로젝트', '업무', 'work', 'meeting', 'project', 'business', 'client', 'customer'],
        personal: ['개인', '가족', '친구', 'personal', 'family', 'friend', 'hobby', '취미'],
        health: ['운동', '헬스', '병원', '의사', 'health', 'exercise', 'gym', 'hospital', 'doctor'],
        learning: ['학습', '공부', '강의', '세미나', 'learning', 'study', 'lecture', 'seminar', 'course'],
        social: ['모임', '파티', '축하', 'social', 'party', 'celebration', 'gathering']
      };

      let category: EventClassification['category'] = 'other';
      let priority: EventClassification['priority'] = 'medium';
      let confidence = 0.5;
      const tags: string[] = [];

      // 카테고리 분류
      for (const [cat, words] of Object.entries(keywords)) {
        const matches = words.filter(word => 
          title.includes(word) || description.includes(word) || location.includes(word)
        );
        if (matches.length > 0) {
          category = cat as EventClassification['category'];
          confidence = Math.min(0.9, 0.5 + (matches.length * 0.1));
          tags.push(...matches);
          break;
        }
      }

      // 우선순위 분류
      const highPriorityWords = ['긴급', 'urgent', '중요', 'important', 'deadline', '마감'];
      const lowPriorityWords = ['선택', 'optional', '가능하면', 'if possible'];

      if (highPriorityWords.some(word => title.includes(word) || description.includes(word))) {
        priority = 'high';
        confidence += 0.2;
      } else if (lowPriorityWords.some(word => title.includes(word) || description.includes(word))) {
        priority = 'low';
        confidence -= 0.1;
      }

      // 시간 기반 우선순위 조정
      if (event.start?.dateTime) {
        const startTime = new Date(event.start.dateTime);
        const now = new Date();
        const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntil < 2) {
          priority = 'high';
          confidence += 0.1;
        }
      }

      return {
        category,
        priority,
        tags,
        confidence: Math.min(1.0, Math.max(0.1, confidence))
      };
    } catch (error) {
      logger.error('Event classification failed:', error);
      return {
        category: 'other',
        priority: 'medium',
        tags: [],
        confidence: 0.1
      };
    }
  }

  /**
   * 충돌 감지 - 일정 간의 시간 충돌을 감지하고 해결 방안 제시
   */
  async detectConflicts(events: GoogleCalendarEvent[]): Promise<ConflictDetection> {
    try {
      const conflictingEvents: ConflictDetection['conflictingEvents'] = [];
      const recommendations: string[] = [];

      // 시간순으로 정렬
      const sortedEvents = events.sort((a, b) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date || '');
        const bStart = new Date(b.start?.dateTime || b.start?.date || '');
        return aStart.getTime() - bStart.getTime();
      });

      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];

        if (!current.start?.dateTime || !next.start?.dateTime) continue;

        const currentEnd = new Date(current.end?.dateTime || current.start.dateTime);
        const nextStart = new Date(next.start.dateTime);
        const timeDiff = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // minutes

        if (timeDiff < 0) {
          // 겹치는 일정
          conflictingEvents.push({
            eventId: current.id || '',
            title: current.summary || 'Unknown',
            startTime: current.start.dateTime,
            endTime: current.end?.dateTime || current.start.dateTime,
            conflictType: 'overlap',
            severity: 'high'
          });

          conflictingEvents.push({
            eventId: next.id || '',
            title: next.summary || 'Unknown',
            startTime: next.start.dateTime,
            endTime: next.end?.dateTime || next.start.dateTime,
            conflictType: 'overlap',
            severity: 'high'
          });

          recommendations.push(`"${current.summary}"과 "${next.summary}" 일정이 겹칩니다. 시간을 조정하거나 하나를 취소하세요.`);
        } else if (timeDiff < this.config.conflictDetectionRange) {
          // 인접한 일정 (여행 시간 고려)
          conflictingEvents.push({
            eventId: current.id || '',
            title: current.summary || 'Unknown',
            startTime: current.start.dateTime,
            endTime: current.end?.dateTime || current.start.dateTime,
            conflictType: 'adjacent',
            severity: 'medium'
          });

          recommendations.push(`"${current.summary}"과 "${next.summary}" 일정 사이에 ${timeDiff}분의 간격이 있습니다. 이동 시간을 고려하세요.`);
        }
      }

      return {
        conflictingEvents,
        recommendations
      };
    } catch (error) {
      logger.error('Conflict detection failed:', error);
      return {
        conflictingEvents: [],
        recommendations: []
      };
    }
  }

  /**
   * AI 기반 일정 최적화 추천
   */
  async generateRecommendations(events: GoogleCalendarEvent[]): Promise<AIRecommendation[]> {
    try {
      const recommendations: AIRecommendation[] = [];

      // 생산성 분석
      const workEvents = events.filter(event => {
        const title = event.summary?.toLowerCase() || '';
        return title.includes('회의') || title.includes('미팅') || title.includes('work') || title.includes('meeting');
      });

      const personalEvents = events.filter(event => {
        const title = event.summary?.toLowerCase() || '';
        return title.includes('개인') || title.includes('가족') || title.includes('personal') || title.includes('family');
      });

      // 업무-개인 균형 추천
      if (workEvents.length > personalEvents.length * 2) {
        recommendations.push({
          type: 'work_life_balance',
          title: '업무-개인 균형 개선',
          description: '업무 일정이 개인 일정보다 많습니다. 개인 시간을 더 확보하세요.',
          priority: 'medium',
          actionable: true,
          suggestedActions: [
            '주 1-2회 개인 시간 일정 추가',
            '업무 시간 외 개인 활동 계획',
            '주말 개인 시간 확보'
          ]
        });
      }

      // 연속 회의 감지
      const consecutiveMeetings = this.findConsecutiveMeetings(events);
      if (consecutiveMeetings.length > 0) {
        recommendations.push({
          type: 'productivity',
          title: '연속 회의 최적화',
          description: '연속된 회의가 감지되었습니다. 휴식 시간을 추가하세요.',
          priority: 'high',
          actionable: true,
          suggestedActions: [
            '회의 사이에 15분 휴식 시간 추가',
            '긴급하지 않은 회의는 다른 시간으로 이동',
            '회의 시간을 30분으로 단축 고려'
          ]
        });
      }

      // 자유 시간 분석
      const freeTimeSlots = this.findFreeTimeSlots(events);
      if (freeTimeSlots.length > 0) {
        recommendations.push({
          type: 'time_management',
          title: '자유 시간 활용',
          description: `${freeTimeSlots.length}개의 자유 시간 슬롯이 있습니다.`,
          priority: 'low',
          actionable: true,
          suggestedActions: [
            '자유 시간에 개인 프로젝트 계획',
            '학습 또는 독서 시간으로 활용',
            '운동이나 건강 관리 시간으로 활용'
          ]
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('AI recommendations generation failed:', error);
      return [];
    }
  }

  /**
   * 자동 알림 생성
   */
  async generateAutomatedReminders(event: GoogleCalendarEvent): Promise<AutomatedReminder[]> {
    try {
      const reminders: AutomatedReminder[] = [];
      const title = event.summary?.toLowerCase() || '';

      // 회의 준비 알림
      if (title.includes('회의') || title.includes('미팅') || title.includes('meeting')) {
        reminders.push({
          eventId: event.id || '',
          reminderType: 'preparation',
          message: `회의 준비: ${event.summary}`,
          timing: 'before_1_hour'
        });
      }

      // 외부 장소 이동 알림
      if (event.location && !event.location.includes('온라인') && !event.location.includes('online')) {
        reminders.push({
          eventId: event.id || '',
          reminderType: 'travel',
          message: `이동 준비: ${event.summary} (${event.location})`,
          timing: 'before_30_min'
        });
      }

      // 후속 조치 알림
      if (title.includes('프로젝트') || title.includes('업무') || title.includes('project') || title.includes('work')) {
        reminders.push({
          eventId: event.id || '',
          reminderType: 'follow_up',
          message: `후속 조치 확인: ${event.summary}`,
          timing: 'before_15_min'
        });
      }

      return reminders;
    } catch (error) {
      logger.error('Automated reminders generation failed:', error);
      return [];
    }
  }

  /**
   * 생산성 인사이트 생성
   */
  async generateProductivityInsights(events: GoogleCalendarEvent[]): Promise<ProductivityInsights> {
    try {
      const totalEvents = events.length;
      const workEvents = events.filter(event => {
        const title = event.summary?.toLowerCase() || '';
        return title.includes('회의') || title.includes('미팅') || title.includes('work') || title.includes('meeting');
      }).length;

      const personalEvents = events.filter(event => {
        const title = event.summary?.toLowerCase() || '';
        return title.includes('개인') || title.includes('가족') || title.includes('personal') || title.includes('family');
      }).length;

      // 평균 이벤트 지속 시간 계산
      let totalDuration = 0;
      let durationCount = 0;
      events.forEach(event => {
        if (event.start?.dateTime && event.end?.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          totalDuration += (end.getTime() - start.getTime()) / (1000 * 60); // minutes
          durationCount++;
        }
      });
      const averageEventDuration = durationCount > 0 ? totalDuration / durationCount : 0;

      // 바쁜 날짜 찾기
      const busyDays = this.findBusyDays(events);

      // 자유 시간 슬롯 찾기
      const freeTimeSlots = this.findFreeTimeSlots(events);

      // AI 추천 생성
      const recommendations = await this.generateRecommendations(events);

      return {
        totalEvents,
        workEvents,
        personalEvents,
        averageEventDuration,
        busyDays,
        freeTimeSlots,
        recommendations
      };
    } catch (error) {
      logger.error('Productivity insights generation failed:', error);
      return {
        totalEvents: 0,
        workEvents: 0,
        personalEvents: 0,
        averageEventDuration: 0,
        busyDays: [],
        freeTimeSlots: [],
        recommendations: []
      };
    }
  }

  /**
   * 연속 회의 찾기
   */
  private findConsecutiveMeetings(events: GoogleCalendarEvent[]): GoogleCalendarEvent[][] {
    const consecutiveMeetings: GoogleCalendarEvent[][] = [];
    const sortedEvents = events.sort((a, b) => {
      const aStart = new Date(a.start?.dateTime || a.start?.date || '');
      const bStart = new Date(b.start?.dateTime || b.start?.date || '');
      return aStart.getTime() - bStart.getTime();
    });

    let currentSequence: GoogleCalendarEvent[] = [];
    
    for (const event of sortedEvents) {
      const title = event.summary?.toLowerCase() || '';
      if (title.includes('회의') || title.includes('미팅') || title.includes('meeting')) {
        if (currentSequence.length === 0) {
          currentSequence = [event];
        } else {
          // 이전 회의와의 간격 확인
          const lastEvent = currentSequence[currentSequence.length - 1];
          if (lastEvent.end?.dateTime && event.start?.dateTime) {
            const lastEnd = new Date(lastEvent.end.dateTime);
            const currentStart = new Date(event.start.dateTime);
            const gap = (currentStart.getTime() - lastEnd.getTime()) / (1000 * 60); // minutes
            
            if (gap <= 15) { // 15분 이내면 연속 회의로 간주
              currentSequence.push(event);
            } else {
              if (currentSequence.length >= 2) {
                consecutiveMeetings.push([...currentSequence]);
              }
              currentSequence = [event];
            }
          }
        }
      } else {
        if (currentSequence.length >= 2) {
          consecutiveMeetings.push([...currentSequence]);
        }
        currentSequence = [];
      }
    }

    if (currentSequence.length >= 2) {
      consecutiveMeetings.push(currentSequence);
    }

    return consecutiveMeetings;
  }

  /**
   * 자유 시간 슬롯 찾기
   */
  private findFreeTimeSlots(events: GoogleCalendarEvent[]): ProductivityInsights['freeTimeSlots'] {
    const freeTimeSlots: ProductivityInsights['freeTimeSlots'] = [];
    
    // 오늘부터 7일간의 일정 분석
    const today = new Date();
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const workHours = { start: 9, end: 18 }; // 9시-18시 근무 시간
    
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(today.getTime() + day * 24 * 60 * 60 * 1000);
      const dayEvents = events.filter(event => {
        if (!event.start?.dateTime) return false;
        const eventDate = new Date(event.start.dateTime);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      // 해당 날짜의 일정을 시간순으로 정렬
      const sortedDayEvents = dayEvents.sort((a, b) => {
        const aStart = new Date(a.start?.dateTime || '');
        const bStart = new Date(b.start?.dateTime || '');
        return aStart.getTime() - bStart.getTime();
      });

      let currentTime = new Date(currentDate);
      currentTime.setHours(workHours.start, 0, 0, 0);

      for (const event of sortedDayEvents) {
        if (event.start?.dateTime) {
          const eventStart = new Date(event.start.dateTime);
          
          if (eventStart > currentTime) {
            const duration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60); // minutes
            if (duration >= 30) { // 30분 이상의 자유 시간만
              freeTimeSlots.push({
                date: currentDate.toISOString().split('T')[0],
                startTime: currentTime.toISOString(),
                endTime: eventStart.toISOString(),
                duration
              });
            }
          }
          
          if (event.end?.dateTime) {
            currentTime = new Date(event.end.dateTime);
          }
        }
      }

      // 마지막 일정 이후 시간
      const endTime = new Date(currentDate);
      endTime.setHours(workHours.end, 0, 0, 0);
      
      if (currentTime < endTime) {
        const duration = (endTime.getTime() - currentTime.getTime()) / (1000 * 60);
        if (duration >= 30) {
          freeTimeSlots.push({
            date: currentDate.toISOString().split('T')[0],
            startTime: currentTime.toISOString(),
            endTime: endTime.toISOString(),
            duration
          });
        }
      }
    }

    return freeTimeSlots;
  }

  /**
   * 바쁜 날짜 찾기
   */
  private findBusyDays(events: GoogleCalendarEvent[]): string[] {
    const dayEventCount: { [key: string]: number } = {};
    
    events.forEach(event => {
      if (event.start?.dateTime) {
        const date = new Date(event.start.dateTime).toISOString().split('T')[0];
        dayEventCount[date] = (dayEventCount[date] || 0) + 1;
      }
    });

    // 하루에 5개 이상의 일정이 있는 날을 바쁜 날로 간주
    return Object.entries(dayEventCount)
      .filter(([_, count]) => count >= 5)
      .map(([date, _]) => date);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<SmartFeaturesConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): SmartFeaturesConfig {
    return this.config;
  }
} 