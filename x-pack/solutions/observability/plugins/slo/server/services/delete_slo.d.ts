import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
interface Options {
    skipDataDeletion: boolean;
    skipRuleDeletion: boolean;
}
export declare class DeleteSLO {
    private repository;
    private transformManager;
    private summaryTransformManager;
    private scopedClusterClient;
    private rulesClient;
    private logger;
    private abortController;
    constructor(repository: SLODefinitionRepository, transformManager: TransformManager, summaryTransformManager: TransformManager, scopedClusterClient: IScopedClusterClient, rulesClient: RulesClientApi, logger: Logger, abortController?: AbortController);
    execute(sloId: string, options?: Options): Promise<void>;
    private deleteRollupData;
    private deleteSummaryData;
    private deleteAssociatedRules;
}
export {};
