export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  fallbackStreamUrls?: string[];
  logo?: string;
  website?: string;
  description?: string;
}

// Gün numarası JavaScript ile aynıdır: pazar 0, pazartesi 1.
export interface RadioProgram {
  id: string;
  stationId: string;
  title: string;
  presenter?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}
export type PlayerStatus =
  | 'idle'
  | 'connecting'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'reconnecting'
  | 'error';
export interface UserSettings {
  playOnMobileData: boolean;
  notificationLeadMinutes: number;
  autoPlayFromNotification: boolean;
  autoResumeAfterNetworkRecovery: boolean;
  theme: 'system' | 'light' | 'dark';
}
export type RootStackParams = {
  Player: undefined;
  Radios: undefined;
  Programs: undefined;
  Favorites: undefined;
  Settings: undefined;
  Program: { programId: string };
};
