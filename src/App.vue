<script setup lang="ts">
import { ref, onMounted } from 'vue';
//import { VuePDF, usePDF } from '@tato30/vue-pdf';
import { VuePDF, usePDF } from '@/VuePDF-src';
const pdf = ref();
const getPdf = () => {
  pdf.value = usePDF('/probably_acroform_ok10.pdf');
};
onMounted(() => {
  getPdf();
});
</script>
<template>
  <div>
    <button @click="getPdf">Get PDF</button>
  </div>
  <VuePDF :pdf="pdf.pdf" v-if="pdf" />
</template>
