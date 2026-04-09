import { ref } from 'vue';
import { api } from './api';

const loading = ref(false);
const error = ref<string | null>(null);

export function useDeploy() {
  async function deploy(scriptName: string, code: string) {
    loading.value = true;
    error.value = null;
    try {
      return await api<{ url: string | null; scriptName: string; remaining: number }>('/api/deploy', {
        method: 'POST',
        body: JSON.stringify({ scriptName, code }),
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Deploy failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, deploy };
}
