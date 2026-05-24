export type RoomStatus = 'waiting' | 'active' | 'paused' | 'completed';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
}

export interface Participant {
  id: string;
  name: string;
  answers: { [questionId: string]: number }; // questionId -> selectedOptionIndex
  score: number;
  currentQuestionIndex: number; // 0-based index of where they are
  isCompleted: boolean;
  completedAt?: number; // timestamp
  isBot?: boolean;
}

export interface Room {
  id: string; // e.g., "MATH-101" or a random 4-letter code
  title: string;
  status: RoomStatus;
  questions: Question[];
  participants: Participant[];
  createdAt: number;
  teacherPasscode: string; // so they can refresh and reconnect securely
  isTeacherLed: boolean; // if true, teacher controls which question everyone is on
  currentQuestionIndex: number; // only relevant if isTeacherLed is true
}

export interface PresetQuiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}
