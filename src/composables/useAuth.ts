import { computed, ref } from 'vue';
import { api } from './api';

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  accountId: string | null;
  authMode: 'oauth' | 'api_token' | 'none';
};

const user = ref<AuthUser | null>(null);
const loading = ref(false);
const authError = ref<string | null>(null);

export function useAuth() {
  const isAuthed = computed(() => !!user.value);

  async function refresh() {
    loading.value = true;
    authError.value = null;
    try {
      const data = await api<{ user: AuthUser | null; oauthEnabled: boolean }>('/api/auth/me');
      user.value = data.user;
      return data;
    } catch (err) {
      user.value = null;
      authError.value = err instanceof Error ? err.message : 'Auth check failed';
      return { user: null, oauthEnabled: false };
    } finally {
      loading.value = false;
    }
  }

  async function saveApiToken(token: string, accountId?: string) {
    await api('/api/auth/token', {
      method: 'PUT',
      body: JSON.stringify({ token, accountId }),
    });
    await refresh();
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    user.value = null;
  }

  return {
    user,
    isAuthed,
    loading,
    authError,
    refresh,
    saveApiToken,
    logout,
  };
}
