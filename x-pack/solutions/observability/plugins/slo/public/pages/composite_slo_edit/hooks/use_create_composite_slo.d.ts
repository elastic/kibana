import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { CreateCompositeSLOForm } from '../types';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useCreateCompositeSlo(): import("@kbn/react-query").UseMutationResult<{
    id: string;
    name: string;
    description: string;
    compositeMethod: "weightedAverage";
    timeWindow: {
        duration: string;
        type: "rolling";
    };
    budgetingMethod: "occurrences";
    objective: {
        target: number;
    };
    tags: string[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    version: number;
    members: {
        sloId: string;
        weight: number;
        instanceId?: string | undefined;
    }[];
}, ServerError, {
    compositeSlo: CreateCompositeSLOForm;
}, unknown>;
export {};
