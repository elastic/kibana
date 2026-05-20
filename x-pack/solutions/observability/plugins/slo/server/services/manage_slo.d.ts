import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
export declare class ManageSLO {
    private repository;
    private transformManager;
    private summaryTransformManager;
    private userId;
    constructor(repository: SLODefinitionRepository, transformManager: TransformManager, summaryTransformManager: TransformManager, userId: string);
    enable(sloId: string): Promise<void>;
    disable(sloId: string): Promise<void>;
}
