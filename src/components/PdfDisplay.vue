<script lang="ts" setup>
import { useClientForm } from '@/stores/client-form'
import { VuePDF } from '@tato30/vue-pdf'
import '@tato30/vue-pdf/style.css'
import { onMounted, onUnmounted, ref, type VNodeRef } from 'vue'

const formStore = useClientForm()
const vuePDFRef = ref<VNodeRef | undefined>(undefined)

function handleWindowSizeChange() {
    if (vuePDFRef.value) {
        vuePDFRef.value.reload()
    }
}

onMounted(() => {
    window.addEventListener('resize', handleWindowSizeChange)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleWindowSizeChange)
})
</script>

<template>
    <VuePDF
        class="pdf"
        annotation-layer
        fit-parent
        on-layer
        ref="vuePDFRef"
        text-layer
        v-if="formStore.pdf"
        :annotations-map="formStore.annotationStorage"
        :hide-forms="formStore.editable"
        :page="formStore.page"
        :pdf="formStore.pdf"
        @annotation="formStore.onAnnotation"
        @loaded="formStore.onLoaded">
        <div>Bitte warten Sie einen Moment, die PDF wird geladen ...</div>
    </VuePDF>
    <div
        class="spinner-border"
        role="status"
        v-else></div>
    <!-- <div
        class="debug-warning"
        v-else>
        Not rendering VuePDF container because
        <span class="debug-highlight">form.pdf</span> is {{ typeof form.pdf }}.
    </div> -->
</template>
