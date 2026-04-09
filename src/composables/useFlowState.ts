import { ref } from 'vue';

const description = ref('');
const generatedCode = ref('');
const scriptName = ref('');
const deployedUrl = ref<string | null>(null);

export function slugifyWorkerName(input: string) {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return (slug || 'shipwrkrs-worker').slice(0, 63);
}

export function useFlowState() {
  return {
    description,
    generatedCode,
    scriptName,
    deployedUrl,
  };
}
