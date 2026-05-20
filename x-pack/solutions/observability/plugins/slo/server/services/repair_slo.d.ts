import type { IScopedClusterClient } from '@kbn/core/server';
import { type Logger } from '@kbn/core/server';
import type { RepairActionsGroupResult, RepairParams } from '@kbn/slo-schema';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { DefaultSummaryTransformManager } from './summay_transform_manager';
import type { DefaultTransformManager } from './transform_manager';
export declare class RepairSLO {
    private logger;
    private scopedClusterClient;
    private repository;
    private transformManager;
    private summaryTransformManager;
    constructor(logger: Logger, scopedClusterClient: IScopedClusterClient, repository: SLODefinitionRepository, transformManager: DefaultTransformManager, summaryTransformManager: DefaultSummaryTransformManager);
    execute(params: RepairParams): Promise<RepairActionsGroupResult[]>;
    private identifyRepairActionsGroup;
    private executeRepairActionsGroup;
    private executeRepairAction;
}
