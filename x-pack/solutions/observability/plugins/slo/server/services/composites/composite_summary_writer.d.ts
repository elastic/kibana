import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CompositeSLOMemberSummary } from '@kbn/slo-schema';
import type { CompositeSLODefinition } from '../../domain/models';
import type { computeCompositeSummary } from './compute_composite_summary';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
export interface CompositeSummaryDoc {
    spaceId: string;
    summaryUpdatedAt: string;
    compositeSlo: {
        id: string;
        name: string;
        description: string;
        tags: string[];
        objective: {
            target: number;
        };
        timeWindow: {
            duration: string;
            type: string;
        };
        budgetingMethod: string;
        createdAt: string;
        updatedAt: string;
    };
    sliValue: number;
    status: string;
    errorBudgetInitial: number;
    errorBudgetConsumed: number;
    errorBudgetRemaining: number;
    errorBudgetIsEstimated: boolean;
    fiveMinuteBurnRate: number;
    oneHourBurnRate: number;
    oneDayBurnRate: number;
    unresolvedMemberIds: string[];
    members: CompositeSLOMemberSummary[];
}
export declare function buildCompositeSummaryDoc(compositeSlo: CompositeSLODefinition, summary: ReturnType<typeof computeCompositeSummary>['compositeSummary'], members: CompositeSLOMemberSummary[], spaceId: string, unresolvedMemberIds: string[]): CompositeSummaryDoc;
interface PersistCompositeSummaryDocParams {
    esClient: ElasticsearchClient;
    summaryClient: SummaryClient;
    sloDefinitionRepository: SLODefinitionRepository;
    logger: Logger;
    spaceId: string;
    compositeSlo: CompositeSLODefinition;
}
/**
 * Computes a composite SLO summary live and writes it to the summary index with refresh: true.
 * Used by create/update routes to ensure the find route can immediately surface newly created
 * or updated composites without waiting for the next background task run.
 */
export declare function persistCompositeSummaryDoc({ esClient, summaryClient, sloDefinitionRepository, logger, spaceId, compositeSlo, }: PersistCompositeSummaryDocParams): Promise<void>;
export {};
