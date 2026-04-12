<script setup lang="ts">
import type { TabsTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsTrigger, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TabsTrigger
    v-bind="forwardedProps"
    :class="cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
      '[font-family:var(--mono)] font-semibold',
      '[color:var(--t2)] [border:1.5px_solid_var(--bd)] [background-color:transparent]',
      'data-[state=active]:[background-color:var(--o)] data-[state=active]:[border-color:var(--o)] data-[state=active]:text-primary-foreground data-[state=active]:font-bold',
      props.class,
    )"
  >
    <span class="truncate">
      <slot />
    </span>
  </TabsTrigger>
</template>
