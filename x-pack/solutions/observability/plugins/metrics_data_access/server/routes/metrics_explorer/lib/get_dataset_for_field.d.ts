import type { ESSearchClient } from '../../../lib/metrics/types';
export declare const getDatasetForField: (client: ESSearchClient, field: string, indexPattern: string, timerange: {
    to: number;
    from: number;
}) => Promise<string | null | undefined>;
