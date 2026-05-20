import type { HttpSetup } from '@kbn/core/public';
type DataFetcher<T, R> = (params: T, ctrl: AbortController, http: HttpSetup) => Promise<R>;
export declare const useDataFetcher: <ApiCallParams, AlertDataType>({ paramsForApiCall, initialDataState, executeApiCall, shouldExecuteApiCall, }: {
    paramsForApiCall: ApiCallParams;
    initialDataState: AlertDataType;
    executeApiCall: DataFetcher<ApiCallParams, AlertDataType>;
    shouldExecuteApiCall: (params: ApiCallParams) => boolean;
}) => {
    data: AlertDataType;
    loading: boolean;
    error: boolean;
};
export {};
