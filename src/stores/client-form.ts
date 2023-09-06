import ConfirmModal from '@/components/ConfirmModal.vue'
import { post, waitForElement } from '@/lib'
import { annotationMapper, initAnnotationStorage } from '@/lib/pdf'
import { useMandate } from '@/stores/mandateStore'
import {
    DocumentTypeId,
    type AnnotationUpdate,
    type AnnotationsMap,
    type FieldObject,
    type FieldObjects,
    type Form,
    type FormEmailAttachment,
    type Signature
} from '@/types'
import { AxiosError, type AxiosResponse } from 'axios'
import * as PDFJS from 'pdfjs-dist'
import { type PageViewport } from 'pdfjs-dist'
import { defineStore } from 'pinia'
import {
    computed,
    h,
    onMounted,
    reactive,
    ref,
    render,
    shallowRef,
    watch,
    type ComputedRef
} from 'vue'
import { useRoute } from 'vue-router'
import { useDocuments } from './documentStore'

const c = 'color: #59f; padding: 4px; margin: 8px 0; border: 2px solid #f59;'
const c1 = 'color: #39c; padding: 4px; margin: 8px 0; border: 2px solid #c93;'
const c2 = 'background: #f35; color: #fff; padding: 4px;'

export const useClientForm = defineStore('client-form', () => {
    const route = useRoute()
    const mandate = useMandate()
    const documentStore = useDocuments()

    const page = ref<number>(1)
    const ready = ref<boolean>(false)
    const loading = ref<boolean>(false)
    const hasChanges = ref<boolean>(false)
    const hasSubmitted = ref<boolean>(false)
    const isLoadingPDF = ref<boolean>(false)
    const showSignModal = ref<boolean>(false)
    const showConfirmModal = ref<boolean>(false)

    const pages = shallowRef<number>(0)
    const pdf = shallowRef<any | undefined>()

    const signatures = reactive<{
        [key: string]: Signature
    }>({})
    const selectedSignatureAnnotation = ref<FieldObject | null>(null)
    const selectedForm = ref<Form>()
    const annotationStorage = ref<AnnotationsMap>({})
    const fieldObjects = ref<FieldObjects>(null)

    const signatureRegexp =
        route.name === 'client-response-view'
            ? /^(?!.*lawfirm).*signature/gim
            : /signature_lawfirm/gim

    const editable: ComputedRef<boolean> = computed(() => {
        return selectedForm.value ? selectedForm.value.documentProperties.tag === 'SIGNED' : false
    })

    const requestableForms: ComputedRef<Form[]> = computed(() => {
        return documentStore.documents.requestable
            .filter((x): x is Form => x.documentType.id === DocumentTypeId.PDF_TEMPLATE)
            .filter((x: Form) => x.documentProperties.tag === 'MASTER')
    })

    const signatureFields: ComputedRef<FieldObjects> = computed(() => {
        if (!fieldObjects.value) {
            return {}
        }

        return Object.fromEntries(
            Object.entries(fieldObjects.value).filter(([key]) => key.search(signatureRegexp) !== -1)
        )
    })

    const hasAllSignatures: ComputedRef<boolean> = computed(() => {
        if (!fieldObjects.value || !signatureFields.value) {
            return true
        }

        const doneSignatures = Object.values(signatures).map((x) => x.annotation_field_name)
        return Object.values(signatureFields.value)
            .flat()
            .every((elem) => doneSignatures.includes(elem.name))
    })

    function selectFormById(id: string): void {
        selectedForm.value = requestableForms.value.find((f) => f.documentProperties.id === id)
    }

    function prevPage(): void {
        page.value = page.value > 1 ? page.value - 1 : page.value
    }

    function nextPage(): void {
        if (!pdf.value) {
            return
        }
        page.value = page.value < pages.value ? page.value + 1 : page.value
    }

    function gotoPage(index: number): void {
        page.value = index
    }

    function confirmDialog(message: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const confirmModal = h(ConfirmModal, {
                message,
                onConfirm: () => {
                    showConfirmModal.value = false
                    resolve(true)
                },
                onCancel: () => {
                    showConfirmModal.value = false
                    reject(false)
                }
            })
            render(confirmModal, document.getElementById('confirm-modal') as HTMLElement)
            showConfirmModal.value = true
        })
    }

    function resetForm(): void {
        confirmDialog('Möchten Sie das Dokument zurücksetzen?')
            .then(() => {
                initClientResponse()
            })
            .catch(() => {
                console.info('The user cancelled the reset form action.')
            })
    }

    function submitForm(): void {
        confirmDialog('Möchten Sie das Dokument senden?')
            .then(() => {
                annotationMapper(pdf, annotationStorage.value)
                    .then((annotationData) => {
                        post('/doc/response/submit', {
                            signatures,
                            annotationData,
                            token: route.params.token.toString()
                        })
                            .then((response: AxiosResponse) => {
                                console.log('%cDocument submitted', c2, response)
                                selectedForm.value = response.data.payload.document
                                hasSubmitted.value = true
                            })
                            .catch((err: AxiosError) => {
                                console.warn(err)
                            })
                    })
                    .catch((err) => {
                        console.warn(err)
                    })
            })
            .catch(() => {
                console.info('The user cancelled the submit form action.')
            })
    }

    function updateSignatureAnnotation(annotation: FieldObject, el: HTMLElement): void {
        console.log('updateSignatureAnnotation')
        const vnode = h(
            'div',
            {
                style: {
                    width: '100%',
                    height: '100%',
                    padding: '4px',
                    zIndex: '1000',
                    display: 'flex',
                    color: '#c44747',
                    cursor: 'pointer',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    borderRadius: '2px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#c4474777',
                    border: '2px dashed #c44747'
                },
                onClick: () => {
                    selectedSignatureAnnotation.value = annotation
                    showSignModal.value = !showSignModal.value
                }
            },
            ''
        )

        if (!vnode.props) {
            return
        }

        const signature = signatures[annotation.name]

        if (signature) {
            console.info('Found signature for annotation', annotation.id)
            vnode.props.style.backgroundColor = '#dfd'
            const img = h('img', {
                src: signature.data_uri,
                alt: annotation.name,
                class: 'signature',
                style: {
                    border: '2px solid #c44747'
                },
                onClick: () => {
                    selectedSignatureAnnotation.value = annotation
                    showSignModal.value = !showSignModal.value
                }
            })
            render(img, el)
        } else {
            console.info('No signature found for annotation', annotation.id)
            vnode.props.style.backgroundColor = '#fde'
            vnode.children = 'HIER UNTERSCHREIBEN'
            render(vnode, el)
        }
    }

    function markSignatures(): void {
        if (!fieldObjects.value || !signatureFields.value) {
            console.warn("Can't mark signatures, no fieldObjects or signatureFields found.")
            return
        }

        // Find all signature annotations
        Object.entries(signatureFields.value).forEach(([, value]) => {
            value.forEach((v: any) => {
                const name = `section[data-annotation-id="${v.id}"]`
                waitForElement(name).then((el) => {
                    updateSignatureAnnotation(v, el as HTMLElement)
                })
            })
        })
    }

    function renderError(err: Error) {
        render(
            h(
                'div',
                {
                    style: {
                        fontWeight: 'bold',
                        fontSize: '1.2em',
                        color: '#c44747',
                        border: '4px solid #c44747',
                        margin: '48px',
                        padding: '24px',
                        width: 'calc(50% - 96px)',
                        maxWidth: '444px'
                    }
                },
                err.message
            ),
            document.getElementById('app') as HTMLElement
        )
    }

    function onAnnotation(update: AnnotationUpdate): void {
        hasChanges.value = true
        console.log(
            '%cVuePDF onAnnotation update',
            'background: #f35; color: #fff; padding: 4px;',
            update
        )
    }

    function loadPDF(src: string): Promise<PDFJS.PDFDocumentLoadingTask> {
        console.log('%cloadPDF', 'background: #f8573a; color: #000; padding: 4px;')
        return new Promise((resolve, reject) => {
            if (!src) {
                isLoadingPDF.value = false
                reject({
                    message: 'No URL provided.'
                })
            }

            if (!PDFJS.GlobalWorkerOptions?.workerSrc) {
                PDFJS.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.js`
            }

            isLoadingPDF.value = true

            const loadingTask = PDFJS.getDocument(src)
            loadingTask.promise
                .then(
                    async (doc) => {
                        console.log('%cloadingTask completed', c, loadingTask)
                        pdf.value = doc.loadingTask
                        pages.value = doc.numPages

                        doc.getFieldObjects()
                            .then((fos: any) => {
                                fieldObjects.value = fos

                                if (fos === null) {
                                    resolve(loadingTask)
                                }

                                console.log('%cfieldObjects', c, fos)

                                mapPrefillData(fos)
                                    .then((annotationMapData) => {
                                        annotationStorage.value = annotationMapData
                                        resolve(loadingTask)
                                    })
                                    .catch((err) => {
                                        console.warn('D', err)
                                        reject(err)
                                    })
                            })
                            .catch((err) => {
                                console.warn('C', err)
                                reject(err)
                            })
                    },
                    (error) => {
                        console.warn('B', error)
                        reject(error)
                    }
                )
                .catch((err) => {
                    console.warn('A', err)
                    reject(err)
                })
        })
    }

    function mapPrefillData(fieldObjects: FieldObjects): Promise<AnnotationsMap> {
        return new Promise((resolve, reject) => {
            if (mandate.prefillData.length === 0) {
                console.warn('mandate.prefillData is empty', mandate.prefillData)
                reject({
                    error: 'mandate.prefillData is empty'
                })
            }

            initAnnotationStorage(pdf).then((annotationsMap: AnnotationsMap) => {
                annotationStorage.value = annotationsMap

                Object.entries(mandate.prefillData).forEach(([key, value]) => {
                    if (fieldObjects && Object.hasOwnProperty.call(fieldObjects, key)) {
                        const fo = fieldObjects[key].find((f: any) => f.name === key)
                        if (fo) {
                            console.log('Changing value of', fo.id, 'to', value)
                            annotationStorage.value[fo.id] = {
                                value: value as string
                            }
                        } else {
                            console.warn(
                                'No fieldObject for key',
                                key,
                                'in fieldObjects',
                                fieldObjects
                            )
                        }
                    } else {
                        console.warn('No fieldObject for key', key, 'in fieldObjects', fieldObjects)
                    }
                })
            })
        })
    }

    const prefill = async (): Promise<FormEmailAttachment> => {
        return new Promise((resolve, reject) => {
            annotationMapper(pdf, annotationStorage.value).then((annotationData) => {
                if (!selectedForm.value) {
                    console.warn('No form selected.')
                    reject()
                    return
                }

                resolve({
                    ...selectedForm.value,
                    documentProperties: {
                        ...selectedForm.value.documentProperties,
                        annotationData,
                        signatures
                    }
                })
            })
        })
    }

    function onLoaded(value: PageViewport): void {
        console.log(
            '%conLoaded',
            'background: #88c365; color: #000; padding: 4px;',
            route.name,
            value
        )
        ready.value = true
        loading.value = false
        if (pdf.value) {
            pdf.value.promise.then((doc: PDFJS.PDFDocumentProxy) => {
                doc.getFieldObjects().then(markSignatures)
            })
        }
    }

    function initClientResponse(): void {
        console.log('initClientResponse', route.params.token)
        post('/doc/request/form', {
            token: route.params.token
        })
            .then((response: AxiosResponse) => {
                selectedForm.value = response.data.payload.document
            })
            .catch((err: AxiosError) => {
                console.warn(err)
                renderError(err)
            })
    }

    onMounted(() => {
        console.log('%conMounted', 'background: #d8af3a; color: #000; padding: 4px;', route.name)

        try {
            if (typeof window === 'undefined' || !('Worker' in window)) {
                throw new Error('Web Workers not supported in this environment.')
            }
        } catch (error) {
            console.warn(error)
        }

        switch (route.name) {
            case 'client-response-view':
                initClientResponse()
                break
            case 'mandate-view':
                break
        }
    })

    watch(annotationStorage, (value) => {
        console.log('%cannotationStorage changed', c1, value)
    })

    watch(selectedForm, (form: Form | undefined) => {
        if (form) {
            loadPDF(form.documentProperties.download.url)
        }
    })

    watch(signatures, () => {
        if (selectedSignatureAnnotation.value) {
            waitForElement(
                `section[data-annotation-id="${selectedSignatureAnnotation.value.id}"]`
            ).then((el) => {
                if (selectedSignatureAnnotation.value) {
                    console.log(
                        'Updating signature annotation',
                        selectedSignatureAnnotation.value,
                        el
                    )
                    updateSignatureAnnotation(selectedSignatureAnnotation.value, el as HTMLElement)
                }
            })
        }
    })

    return {
        annotationStorage,
        gotoPage,
        hasAllSignatures,
        hasChanges,
        nextPage,
        onAnnotation,
        onLoaded,
        page,
        pages,
        pdf,
        prefill,
        editable,
        prevPage,
        ready,
        resetForm,
        selectedForm,
        selectedSignatureAnnotation,
        selectFormById,
        showConfirmModal,
        showSignModal,
        signatures,
        submitForm
    }
})
