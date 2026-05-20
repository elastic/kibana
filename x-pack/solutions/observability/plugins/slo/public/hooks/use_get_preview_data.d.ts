import type { GetPreviewDataResponse, Indicator, Objective } from '@kbn/slo-schema';
export interface UseGetPreviewData {
    data: GetPreviewDataResponse | undefined;
    isInitialLoading: boolean;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
interface Props {
    isValid: boolean;
    remoteName?: string;
    groupings?: Record<string, string | number>;
    objective?: Objective;
    indicator: Indicator;
    range: {
        from: Date;
        to: Date;
    };
    groupBy?: string[];
}
export declare function useGetPreviewData({ isValid, range, indicator, objective, groupings, remoteName, groupBy, }: Props): UseGetPreviewData;
export {};
