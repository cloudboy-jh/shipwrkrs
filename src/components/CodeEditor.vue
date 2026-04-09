<template>
  <div ref="editorRoot" class="code-editor" />
</template>

<script setup lang="ts">
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const editorRoot = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

onMounted(() => {
  if (!editorRoot.value) return;
  editorView = new EditorView({
    parent: editorRoot.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        keymap.of(defaultKeymap),
        javascript({ typescript: false }),
        oneDark,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) emit('update:modelValue', v.state.doc.toString());
        }),
        EditorView.theme({
          '&': { minHeight: '420px', borderRadius: '12px', overflow: 'hidden' },
          '.cm-scroller': { fontFamily: 'var(--font-mono)' },
        }),
      ],
    }),
  });
});

watch(
  () => props.modelValue,
  (next) => {
    if (!editorView) return;
    const current = editorView.state.doc.toString();
    if (next === current) return;
    editorView.dispatch({
      changes: { from: 0, to: current.length, insert: next },
    });
  },
);

onBeforeUnmount(() => editorView?.destroy());
</script>
