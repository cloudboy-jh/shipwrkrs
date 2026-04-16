import { ref } from 'vue';

export type SecretManifestItem = {
  name: string;
  label: string;
  description: string;
  helpUrl?: string;
  placeholder?: string;
  required: boolean;
};

const description = ref('');
const generatedCode = ref('');
const scriptName = ref('');
const deployedUrl = ref<string | null>(null);
const generatedSecrets = ref<SecretManifestItem[]>([]);
const secretValues = ref<Record<string, string>>({});

export function validWorkerName(input: string) {
  return /^[a-z0-9-]{1,63}$/.test(input);
}

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
    generatedSecrets,
    secretValues,
  };
}
