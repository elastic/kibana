import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { PostHealthScanResponse } from '@kbn/slo-schema';
type ServerError = IHttpFetchError<ResponseErrorBody>;
interface Props {
    onSuccess?: (scanId: string) => void;
}
export declare function useScheduleHealthScan(props?: Props): import("@kbn/react-query").UseMutationResult<PostHealthScanResponse, ServerError, {
    force?: boolean;
} | undefined, unknown>;
export {};
