<script lang="ts" setup>
import { useClientForm } from '@/stores/client-form'
const formStore = useClientForm()
defineProps({
    showPrevNextButtons: {
        type: Boolean,
        required: false,
        default: false
    }
})
</script>
<template>
    <nav
        aria-label="page-navigation"
        v-if="formStore.pdf && formStore.pages > 1">
        <ul class="pagination">
            <li
                class="page-item"
                v-if="showPrevNextButtons">
                <button
                    class="btn"
                    :disabled="formStore.page == 1"
                    @click="formStore.prevPage"
                    >Zurück</button
                >
            </li>
            <li
                class="page-item"
                v-for="index in formStore.pages"
                :key="index">
                <button
                    class="btn"
                    :class="{ 'btn-danger': index == formStore.page }"
                    @click="formStore.gotoPage(index)">
                    {{ index }}
                </button>
            </li>
            <li
                class="page-item"
                v-if="showPrevNextButtons">
                <button
                    class="btn"
                    :class="{ active: formStore.pages == formStore.page }"
                    :disabled="formStore.page == formStore.pages"
                    @click="formStore.nextPage"
                    >Vor</button
                >
            </li>
        </ul>
    </nav>
</template>
<style scoped>
nav {
    display: flex;
    justify-content: end;
    margin-top: 12px;
    z-index: 1;
}

nav > ul {
    gap: 4px;
}

input:disabled {
    color: black;
}

*:disabled {
    color: black;
}
</style>
