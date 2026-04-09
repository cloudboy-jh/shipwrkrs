import { ref } from 'vue';
import { api } from './api';

export type LimitInfo = {
  generationsFreeRemaining: number;
  generationsPremiumRemaining: number;
  deploysRemaining: number;
};

const limits = ref<LimitInfo | null>(null);

export function useMeta() {
  async function refreshLimits() {
    const res = await api<LimitInfo>('/api/limits');
    limits.value = res;
  }

  return { limits, refreshLimits };
}
