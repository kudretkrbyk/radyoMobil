import { create } from 'zustand';
import type { PlayerStatus, RadioStation } from '../../../types';
export const usePlayerStore = create<{
  status: PlayerStatus;
  wantsPlayback: boolean;
  station?: RadioStation;
  message?: string;
  metadata?: string;
  sleepAt?: number;
  online: boolean;
  cellular: boolean;
}>(() => ({
  status: 'idle',
  wantsPlayback: false,
  online: true,
  cellular: false,
}));
