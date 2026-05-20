import type { CreateSLOInput } from '@kbn/slo-schema';
export declare function useFetchSloInspect(slo: CreateSLOInput, shouldInspect: boolean): {
    data: {
        slo: import("@kbn/slo-schema").CreateSLOParams;
        rollUpPipeline: Record<string, any>;
        summaryPipeline: Record<string, any>;
        rollUpTransform: import("@elastic/elasticsearch/lib/api/types").TransformPutTransformRequest;
        summaryTransform: import("@elastic/elasticsearch/lib/api/types").TransformPutTransformRequest;
        temporaryDoc: Record<string, any>;
        rollUpTransformCompositeQuery: string;
        summaryTransformCompositeQuery: string;
    } | undefined;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
};
