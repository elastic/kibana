import type { ElasticsearchClient } from '@kbn/core/server';
import type { Duration, SLODefinition } from '../domain/models';
type WindowName = string;
interface LookbackWindow {
    name: WindowName;
    duration: Duration;
}
interface BurnRateResult {
    burnRate: number;
    sli: number;
    name: WindowName;
}
interface CalculateBatchParams {
    slo: SLODefinition;
    instanceId: string;
    lookbackWindows: LookbackWindow[];
    remoteName?: string;
}
export interface BurnRatesClient {
    calculate(slo: SLODefinition, instanceId: string, lookbackWindows: LookbackWindow[], remoteName?: string): Promise<BurnRateResult[]>;
    calculateBatch(params: CalculateBatchParams[]): Promise<BurnRateResult[][]>;
}
export declare class DefaultBurnRatesClient implements BurnRatesClient {
    private esClient;
    constructor(esClient: ElasticsearchClient);
    calculate(slo: SLODefinition, instanceId: string, lookbackWindows: LookbackWindow[], remoteName?: string): Promise<Array<{
        burnRate: number;
        sli: number;
        name: WindowName;
    }>>;
    calculateBatch(params: CalculateBatchParams[]): Promise<BurnRateResult[][]>;
    private calculateBatchWithNamedFilters;
    private calculateBatchWithMsearch;
}
export {};
