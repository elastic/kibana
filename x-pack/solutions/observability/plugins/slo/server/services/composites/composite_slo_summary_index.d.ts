import type { ElasticsearchClient } from '@kbn/core/server';
import type { CompositeSLOMemberSummary, CompositeSLOSummary } from '@kbn/slo-schema';
export interface PersistedCompositeSummary {
    summary: CompositeSLOSummary;
    members?: CompositeSLOMemberSummary[];
}
export declare function buildCompositeSloSummaryDocId(spaceId: string, compositeId: string): string;
export declare function mapCompositeSummaryIndexSource(source: unknown): PersistedCompositeSummary | undefined;
export declare function fetchCompositeSloSummariesFromIndex(esClient: ElasticsearchClient, spaceId: string, compositeIds: readonly string[]): Promise<Map<string, PersistedCompositeSummary>>;
