import type { IScopedClusterClient } from '@kbn/core/server';
export declare function getToolHandler({ esClient, start, end, index, kqlFilter: kqlFilterValue, messageField, }: {
    esClient: IScopedClusterClient;
    start: string;
    end: string;
    index: string;
    kqlFilter?: string;
    messageField: string;
}): Promise<import("../../utils/get_change_points").ChangePoint[]>;
