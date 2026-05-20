import type { Cases } from '@kbn/cases-plugin/common';
export declare const useFetchBulkCases: ({ ids, }: {
    ids: string[];
}) => {
    cases: Cases;
    isLoading: boolean;
    error?: Record<string, any>;
};
