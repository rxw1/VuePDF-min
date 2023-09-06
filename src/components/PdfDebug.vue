<script setup lang="ts">
import { useClientForm } from '@/stores/client-form'
const form = useClientForm()
</script>

<template>
	<div class="debug">
		<!-- <div>mode: {{ form.mode }}</div> -->
		<hr />
		<!-- <div>ready: {{ form.ready }}</div> -->
		<!-- <div>loading: {{ form.loading }}</div> -->
		<!-- <div>hasChanges: {{ form.hasChanges }}</div> -->
		<hr />
		<!-- <div>page: {{ form.page }}</div> -->
		<!-- <div>form: {{ form.form }}</div> -->
		<hr />
		<!-- <div>signatures: {{ form.signatures }}</div> -->
		<!-- <div>annotations: {{ form.annotations }}</div> -->
		<!-- <div>annotationData: {{ form.annotationData }}</div> -->
		<!-- <div>annotationStorage: {{ form.annotationStorage }}</div> -->
		<!-- <div>emptyFields: {{ form.emptyFields }}</div> -->
		<!-- <div>signatureAnnotations: {{ form.signatureAnnotations }}</div> -->
		<hr />
		<!-- <div>hasRequired: {{ form.hasRequired }}</div> -->
		<!-- <div>hasAllSignatures: {{ form.hasAllSignatures }}</div> -->
		<hr />
		<!-- <div>fields: {{ form.fields ? Object.entries(form.fields).length : "N/A" }}</div> -->
		<!-- <button @click="getAnnotations">
	                    get annotations
	                </button> -->
	</div>
</template>

<style scoped>
.debug {
	display: flex;
	position: fixed;
	bottom: 64px;
	left: 12px;
	flex-direction: column;
	z-index: 4444;
	border: 2px solid #f39;
	background-color: #feeb;
	padding: 8px;
	max-width: 444px;
	overflow: wrap;
	line-height: 1em;
	font-family: monospace;
	font-size: 13px;
	font-weight: bold;
}

.debug hr {
	margin: 4px;
	color: #222;
}
</style>
