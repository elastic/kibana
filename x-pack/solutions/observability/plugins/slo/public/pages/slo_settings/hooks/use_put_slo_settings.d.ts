import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { PutServerlessSLOSettingsParams, PutSLOSettingsParams } from '@kbn/slo-schema';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function usePutSloSettings(): import("@kbn/react-query").UseMutationResult<{
    useAllRemoteClusters: boolean;
    selectedRemoteClusters: string[];
    staleThresholdInHours: number;
    staleInstancesCleanupEnabled: boolean;
}, ServerError, {
    settings: PutSLOSettingsParams | PutServerlessSLOSettingsParams;
}, unknown>;
export {};
