import type { QuerySchema } from '@kbn/slo-schema';
import type { Logger } from '@kbn/logging';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SLODefinition } from '../../domain/models';
export declare function getElasticsearchQueryOrThrow(kuery?: QuerySchema, dataView?: DataView): {
    bool: import("@kbn/es-query").BoolQuery;
} | {
    match_all: {};
};
export declare function parseStringFilters(filters: string, logger: Logger): any;
export declare function parseIndex(index: string): string | string[];
export declare function getTimesliceTargetComparator(timesliceTarget: number): ">" | ">=";
/**
 * Use the settings.preventInitialBackfill flag to determine the range filter for the rollup transform
 * preventInitialBackfill == true: we use the current time minus some buffer to account for the ingestion delay
 * preventInitialBackfill === false: we use the time window duration to get the data for the last N days
 */
export declare function getFilterRange(slo: SLODefinition, timestampField: string, isServerless: boolean): {
    range: {
        [timestampField]: {
            gte: string;
        };
    };
};
