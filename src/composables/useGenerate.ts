import { ref } from 'vue';
import { api, normalizeWorkerCode } from './api';
import type { SecretManifestItem } from './useFlowState';

type Tier = 'free' | 'premium';

const loading = ref(false);
const error = ref<string | null>(null);

export function useGenerate() {
  async function generate(description: string, tier: Tier) {
    loading.value = true;
    error.value = null;
    try {
      const res = await api<{
        code: string;
        scriptName: string;
        secrets: SecretManifestItem[];
        model: string;
        remaining: number;
      }>('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ description, tier }),
      });
      return { ...res, code: normalizeWorkerCode(res.code) };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Generation failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, generate };
}
