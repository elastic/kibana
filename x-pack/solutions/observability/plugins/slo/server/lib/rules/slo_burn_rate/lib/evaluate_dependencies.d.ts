import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { Dependency } from '../../../../../common/burn_rate_rule/types';
import type { SLODefinitionRepository } from '../../../../services';
import type { BurnRateRuleParams } from '../types';
import type { SLODefinition } from '../../../../domain/models';
export interface ActiveRule {
    rule: Rule<BurnRateRuleParams>;
    slo: SLODefinition;
    instanceIdsToSuppress: string[];
    suppressAll: boolean;
}
export interface EvaulateDependenciesResponse {
    activeRules: ActiveRule[];
}
export declare function evaluateDependencies(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, sloRepository: SLODefinitionRepository, dependencies: Dependency[], startedAt: Date): Promise<EvaulateDependenciesResponse>;
