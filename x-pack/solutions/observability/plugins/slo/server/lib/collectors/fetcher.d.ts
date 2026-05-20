import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
export declare const fetcher: (context: CollectorFetchContext) => Promise<{
    slo: {
        total: number;
        definitions: {
            total: number;
            total_with_ccs: number;
            total_with_groups: number;
        };
        instances: {
            total: number;
        };
        by_status: {
            enabled: number;
            disabled: number;
        };
        by_sli_type: {
            [sli_type: string]: number;
        };
        by_rolling_duration: {
            [duration: string]: number;
        };
        by_calendar_aligned_duration: {
            [duration: string]: number;
        };
        by_budgeting_method: {
            occurrences: number;
            timeslices: number;
        };
    };
}>;
