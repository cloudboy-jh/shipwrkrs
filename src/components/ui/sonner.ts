import { ref } from 'vue';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export type ToastItem = {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
};

const toasts = ref<ToastItem[]>([]);

export function useSonner() {
  function pushToast(toast: Omit<ToastItem, 'id'>, timeoutMs = 2600) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    toasts.value.unshift({ id, ...toast });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, timeoutMs);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, pushToast, dismiss };
}
