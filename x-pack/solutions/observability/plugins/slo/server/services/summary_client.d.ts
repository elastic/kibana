import type { ElasticsearchClient } from '@kbn/core/server';
import type { Groupings, Meta, SLODefinition, Summary } from '../domain/models';
import type { TimeWindow } from '../domain/models/time_window';
import type { BurnRatesClient } from './burn_rates_client';
interface Params {
    slo: SLODefinition;
    instanceId?: string;
    remoteName?: string;
    timeWindowOverride?: TimeWindow;
}
export interface BurnRateWindow {
    name: string;
    burnRate: number;
    sli: number;
}
interface SummaryResult {
    summary: Summary;
    groupings: Groupings;
    meta: Meta;
    burnRateWindows: BurnRateWindow[];
}
export interface SummaryClient {
    computeSummary(params: Params): Promise<SummaryResult>;
    computeSummaries(paramsList: Params[]): Promise<SummaryResult[]>;
}
export declare class DefaultSummaryClient implements SummaryClient {
    private esClient;
    private burnRatesClient;
    constructor(esClient: ElasticsearchClient, burnRatesClient: BurnRatesClient);
    computeSummary(params: Params): Promise<SummaryResult>;
    computeSummaries(paramsList: Params[]): Promise<SummaryResult[]>;
    private computeSummariesWithMsearch;
    private computeSummariesWithNamedFilters;
}
export {};
