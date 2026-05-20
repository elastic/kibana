import type { ActiveAlerts } from './active_alerts';
type SloIdAndInstanceId = [string, string];
interface Params {
    sloIdsAndInstanceIds: SloIdAndInstanceId[];
    shouldRefetch?: boolean;
    rangeFrom?: string;
}
export interface UseFetchActiveAlerts {
    data: ActiveAlerts;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export declare function useFetchActiveAlerts({ sloIdsAndInstanceIds, shouldRefetch, rangeFrom, }: Params): UseFetchActiveAlerts;
export {};
