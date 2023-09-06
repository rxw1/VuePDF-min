export const useClientForm = defineStore('client-form', () => {

      const annotationStorage = ref<AnnotationsMap>({})

  
    function onAnnotation(update: AnnotationUpdate): void {
        hasChanges.value = true
        console.log(
            '%cVuePDF onAnnotation update',
            'background: #f35; color: #fff; padding: 4px;',
            update
        )
    }




  export {
    annotationStorage,
    editable,
    page,
    pdf,
    onAnnotaion,
    onLoaded
  }
})
