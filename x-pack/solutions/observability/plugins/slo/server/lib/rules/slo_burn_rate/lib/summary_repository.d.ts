import type { ElasticsearchClient } from '@kbn/core/server';
import type { SLODefinition } from '../../../../domain/models';
import type { EsSummaryDocument } from '../../../../services/summary_transform_generator/helpers/create_temp_summary';
export declare function getSloSummary(esClient: ElasticsearchClient, slo: SLODefinition, instanceId: string): Promise<EsSummaryDocument | undefined>;
