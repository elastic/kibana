import type { AutoAbortedHttpService } from './use_auto_aborted_http_client';
export declare enum AsyncStatus {
    Loading = "loading",
    Init = "init",
    Settled = "settled"
}
export interface AsyncState<T> {
    data?: T;
    error?: Error;
    status: AsyncStatus;
    refresh: () => void;
}
export type UseAsync = <T>(fn: ({ http }: {
    http: AutoAbortedHttpService;
}) => Promise<T> | undefined, dependencies: any[]) => AsyncState<T>;
export declare const useAsync: UseAsync;
