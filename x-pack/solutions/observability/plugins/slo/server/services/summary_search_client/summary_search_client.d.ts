import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SLOSettings } from '../../domain/models';
import type { Paginated, Pagination, Sort, SummaryResult, SummarySearchClient } from './types';
export declare class DefaultSummarySearchClient implements SummarySearchClient {
    private scopedClusterClient;
    private logger;
    private spaceId;
    private settings;
    constructor(scopedClusterClient: IScopedClusterClient, logger: Logger, spaceId: string, settings: SLOSettings);
    search(kqlQuery: string, filters: string, sort: Sort, pagination: Pagination, hideStale?: boolean): Promise<Paginated<SummaryResult>>;
    private deleteOutdatedTemporarySummaries;
}
