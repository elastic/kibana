import { IndexLifecyclePhaseSelectOption, indexLifeCyclePhaseToDataTier } from '@kbn/observability-shared-plugin/common';
import type * as t from 'io-ts';
export { IndexLifecyclePhaseSelectOption, indexLifeCyclePhaseToDataTier };
export declare const indexLifecyclePhaseRt: t.TypeC<{
    indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
}>;
export interface StorageExplorerSummaryAPIResponse {
    totalProfilingSizeBytes: number;
    totalSymbolsSizeBytes: number;
    diskSpaceUsedPct: number;
    totalNumberOfDistinctProbabilisticValues: number;
    totalNumberOfHosts: number;
    dailyDataGenerationBytes: number;
}
export interface StorageExplorerHostDetailsTimeseries {
    hostId: string;
    hostName: string;
    timeseries: Array<{
        x: number;
        y?: number | null;
    }>;
}
export interface StorageExplorerHostDetails {
    hostId: string;
    hostName: string;
    projectId: string;
    probabilisticValues: Array<{
        value: number;
        date: number | null;
    }>;
    totalEventsSize: number;
    totalMetricsSize: number;
    totalSize: number;
}
export interface StorageHostDetailsAPIResponse {
    hostDetailsTimeseries: StorageExplorerHostDetailsTimeseries[];
    hostDetails: StorageExplorerHostDetails[];
}
export type StorageGroupedIndexNames = 'events' | 'stackframes' | 'stacktraces' | 'executables' | 'metrics';
export interface StorageDetailsGroupedByIndex {
    indexName: StorageGroupedIndexNames;
    docCount: number;
    sizeInBytes: number;
}
export interface StorageDetailsPerIndex {
    indexName: string;
    docCount?: number;
    primaryShardsCount?: number;
    replicaShardsCount?: number;
    sizeInBytes?: number;
    dataStream?: string;
    lifecyclePhase?: string;
}
export interface IndicesStorageDetailsAPIResponse {
    storageDetailsGroupedByIndex: StorageDetailsGroupedByIndex[];
    storageDetailsPerIndex: StorageDetailsPerIndex[];
}
