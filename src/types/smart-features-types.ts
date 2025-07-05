export interface EventClassification {
  category: 'work' | 'personal' | 'meeting' | 'health' | 'learning' | 'social' | 'other';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  confidence: number;
}

export interface ConflictDetection {
  conflictingEvents: Array<{
    eventId: string;
    title: string;
    startTime: string;
    endTime: string;
    conflictType: 'overlap' | 'adjacent' | 'travel_time';
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
}

export interface AIRecommendation {
  type: 'schedule_optimization' | 'time_management' | 'productivity' | 'work_life_balance';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedActions: string[];
}

export interface SmartSchedule {
  eventId: string;
  originalTime: string;
  suggestedTime: string;
  reason: string;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface AutomatedReminder {
  eventId: string;
  reminderType: 'preparation' | 'travel' | 'follow_up' | 'custom';
  message: string;
  timing: 'before_1_hour' | 'before_30_min' | 'before_15_min' | 'custom';
  customMinutes?: number;
}

export interface ProductivityInsights {
  totalEvents: number;
  workEvents: number;
  personalEvents: number;
  averageEventDuration: number;
  busyDays: string[];
  freeTimeSlots: Array<{
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  }>;
  recommendations: AIRecommendation[];
}

export interface SmartFeaturesConfig {
  enableClassification: boolean;
  enableConflictDetection: boolean;
  enableAIRecommendations: boolean;
  enableAutomatedReminders: boolean;
  enableProductivityInsights: boolean;
  classificationThreshold: number;
  conflictDetectionRange: number; // minutes
  reminderDefaults: {
    preparation: number;
    travel: number;
    followUp: number;
  };
} 