import type { ElasticsearchClient } from '@kbn/core/server';
import type { SLODefinition } from '../../domain/models';
export declare function assertExpectedIndicatorSourceIndexPrivileges(slo: SLODefinition, esClient: ElasticsearchClient): Promise<void>;
