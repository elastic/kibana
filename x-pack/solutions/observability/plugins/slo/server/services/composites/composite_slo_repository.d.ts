import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { CompositeSLODefinition } from '../../domain/models';
export interface CompositeSLORepository {
    create(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
    update(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
    findById(id: string): Promise<CompositeSLODefinition>;
    findAllByIds(ids: string[]): Promise<CompositeSLODefinition[]>;
    deleteById(id: string): Promise<void>;
}
export declare class DefaultCompositeSLORepository implements CompositeSLORepository {
    private soClient;
    private logger;
    constructor(soClient: SavedObjectsClientContract, logger: Logger);
    create(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
    update(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
    findById(id: string): Promise<CompositeSLODefinition>;
    findAllByIds(ids: string[]): Promise<CompositeSLODefinition[]>;
    deleteById(id: string): Promise<void>;
    private toCompositeSLO;
    private isCompositeSLO;
}
