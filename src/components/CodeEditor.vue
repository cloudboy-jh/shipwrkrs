<template>
  <div class="code-editor-shell" :class="{ focused: isFocused }">
    <div class="editor-head">
      <p class="editor-title">Worker code</p>
      <span class="editor-badge">Live Editor</span>
    </div>
    <div ref="editorRoot" class="code-editor" />
    <p class="editor-hint">Click to edit code before deploy.</p>
  </div>
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
const isFocused = ref(false);
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
        EditorView.lineWrapping,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) emit('update:modelValue', v.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          focus: () => {
            isFocused.value = true;
          },
          blur: () => {
            isFocused.value = false;
          },
        }),
        EditorView.theme({
          '&': {
            minHeight: '420px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--sf)',
          },
          '.cm-scroller': {
            fontFamily: 'var(--mono)',
            lineHeight: '1.55',
            paddingRight: '10px',
          },
          '.cm-content': {
            padding: '12px 12px 12px 0',
          },
          '.cm-line': {
            paddingLeft: '8px',
            paddingRight: '12px',
          },
          '.cm-gutters': {
            backgroundColor: 'color-mix(in srgb, var(--bg), var(--sf) 35%)',
            borderRight: '1px solid var(--bd)',
            color: 'var(--tm)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: 'var(--t2)',
          },
          '.cm-activeLine': {
            backgroundColor: 'color-mix(in srgb, var(--o), transparent 94%)',
          },
          '.cm-cursor': {
            borderLeftColor: 'var(--o)',
          },
          '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: 'color-mix(in srgb, var(--o), transparent 78%)',
          },
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

onBeforeUnmount(() => {
  editorView?.destroy();
  isFocused.value = false;
});
</script>

<style scoped>
.code-editor-shell {
  border: 1px solid var(--bd);
  border-radius: 14px;
  overflow: hidden;
  background: var(--sf);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.code-editor-shell.focused {
  border-color: color-mix(in srgb, var(--o), transparent 52%);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--o), transparent 78%);
}

.editor-head {
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--bd);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--bg), var(--sf) 38%);
}

.editor-title {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--t2);
}

.editor-badge {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  color: #000;
  background: var(--o);
  border-radius: 999px;
  padding: 3px 8px;
}

.code-editor {
  min-height: 420px;
}

.editor-hint {
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid var(--bd);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--tm);
  background: color-mix(in srgb, var(--bg), var(--sf) 38%);
}
</style>
