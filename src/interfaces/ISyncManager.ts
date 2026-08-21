// @/interfaces/ISyncManager.ts
import type { ComputedRef, Ref } from 'vue';
import type { IMonthStats } from '@/interfaces/IMonthStats';

export interface ISyncManager {
  stats: ComputedRef<IMonthStats>;
  sync(): Promise<void>;
  isLoading: Ref<boolean>;
}
