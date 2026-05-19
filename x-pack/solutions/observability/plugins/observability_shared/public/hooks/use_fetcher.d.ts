export declare enum FETCH_STATUS {
    LOADING = "loading",
    SUCCESS = "success",
    FAILURE = "failure",
    PENDING = "pending",
    NOT_INITIATED = "not_initiated"
}
export interface FetcherResult<Data> {
    data?: Data;
    status: FETCH_STATUS;
    error?: Error;
    loading?: boolean;
}
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<infer TResponseType> ? TResponseType : unknown;
export declare function useFetcher<TReturn>(fn: ({}: {
    signal: AbortSignal;
}) => TReturn, fnDeps: any[], options?: {
    preservePreviousData?: boolean;
}): FetcherResult<InferResponseType<TReturn>> & {
    refetch: () => void;
};
export {};
