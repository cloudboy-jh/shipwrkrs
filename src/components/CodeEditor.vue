<template>
  <div class="code-editor-shell" :class="{ focused: isFocused, expanded: isExpanded, 'read-only': readOnly }">
    <div class="editor-head">
      <p class="editor-title">{{ readOnly ? 'Worker code (read-only)' : 'Worker code' }}</p>
      <span v-if="!readOnly" class="editor-badge">Live Editor</span>
    </div>
    <div class="editor-body">
      <div ref="editorRoot" class="code-editor" />
      <button
        v-if="showExpandControl && !isExpanded && !readOnly"
        class="expand-btn"
        type="button"
        aria-label="Expand editor"
        @click="expandEditor"
      >
        <Maximize2 :size="15" />
      </button>
    </div>
    <p v-if="!readOnly" class="editor-hint">Click to edit code before deploy.</p>
  </div>
</template>

<script setup lang="ts">
import { Maximize2 } from 'lucide-vue-next';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap } from '@codemirror/commands';
import { EditorState, Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
  readOnly?: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  'expanded-change': [expanded: boolean];
}>();

const editorRoot = ref<HTMLElement | null>(null);
const isFocused = ref(false);
const isExpanded = ref(false);
const showExpandControl = computed(() => props.modelValue.length >= 30);
let editorView: EditorView | null = null;

function expandEditor() {
  isExpanded.value = true;
  emit('expanded-change', true);
}

const readOnlyCompartment = new Compartment();

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
        readOnlyCompartment.of(props.readOnly ? [EditorState.readOnly.of(true)] : []),
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
            height: 'var(--editor-height)',
            maxHeight: 'var(--editor-height)',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--sf)',
          },
          '.cm-scroller': {
            fontFamily: 'var(--mono)',
            lineHeight: '1.55',
            paddingRight: '22px',
            paddingBottom: '44px',
            height: '100%',
            overflow: 'auto',
          },
          '.cm-content': {
            padding: '12px 22px 12px 0',
          },
          '.cm-line': {
            paddingLeft: '8px',
            paddingRight: '20px',
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

    if (next.length < 30 && isExpanded.value) {
      isExpanded.value = false;
      emit('expanded-change', false);
    }
  },
);

onBeforeUnmount(() => {
  editorView?.destroy();
  isFocused.value = false;
});
</script>

<style scoped>
.code-editor-shell {
  --editor-height: min(62vh, 760px);
  border: 1px solid var(--bd);
  border-radius: 14px;
  overflow: hidden;
  background: var(--sf);
  width: 100%;
  transition: width 220ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

.code-editor-shell.expanded {
  --editor-height: min(78vh, 900px);
  width: max(100%, min(66vw, calc(100vw - 48px)));
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

.editor-body {
  position: relative;
}

.code-editor {
  height: var(--editor-height);
  max-height: var(--editor-height);
}

.expand-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--bd);
  background: color-mix(in srgb, var(--bg), var(--sf) 30%);
  color: var(--t2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 120ms ease;
}

.expand-btn:hover {
  color: var(--tx);
  border-color: var(--o);
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

.code-editor-shell.read-only .editor-head {
  background: color-mix(in srgb, var(--bg), var(--sf) 20%);
}

.code-editor-shell.read-only :deep(.cm-cursor) {
  display: none;
}
</style>
