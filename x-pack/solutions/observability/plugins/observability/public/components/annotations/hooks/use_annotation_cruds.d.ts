export declare const useAnnotationCRUDS: () => {
    updateAnnotation: import("@tanstack/react-query").UseMutateAsyncFunction<import("./use_update_annotation").CreateAnnotationResponse, import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody>, {
        annotation: import("../../../../common/annotations").Annotation;
    }, {
        previousData?: import("@kbn/slo-schema").FindSLOResponse;
        queryKey?: import("@tanstack/query-core").QueryKey;
    }>;
    createAnnotation: import("@tanstack/react-query").UseMutateAsyncFunction<import("./use_create_annotation").CreateAnnotationResponse, import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody>, {
        annotation: import("../../../../common/annotations").CreateAnnotationParams;
    }, {
        previousData?: import("@kbn/slo-schema").FindSLOResponse;
        queryKey?: import("@tanstack/query-core").QueryKey;
    }>;
    deleteAnnotation: import("@tanstack/react-query").UseMutateAsyncFunction<void, import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody>, {
        annotations: import("../../../../common/annotations").Annotation[];
    }, {
        queryKey?: import("@tanstack/query-core").QueryKey;
    }>;
    isSaving: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isLoading: boolean;
};
