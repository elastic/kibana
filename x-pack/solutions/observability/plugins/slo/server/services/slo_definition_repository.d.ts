import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { Paginated, Pagination } from '@kbn/slo-schema';
import type { SLODefinition } from '../domain/models';
interface SearchParams {
    pagination: Pagination;
    search?: string;
    filters?: {
        includeOutdatedOnly: boolean;
        tags: string[];
    };
}
export interface SLODefinitionRepository {
    create(slo: SLODefinition): Promise<SLODefinition>;
    update(slo: SLODefinition): Promise<SLODefinition>;
    findAllByIds(ids: string[]): Promise<SLODefinition[]>;
    findById(id: string): Promise<SLODefinition>;
    deleteById(id: string, options?: {
        ignoreNotFound?: boolean;
    }): Promise<void>;
    search({ search, pagination, filters }: SearchParams): Promise<Paginated<SLODefinition>>;
}
export declare class DefaultSLODefinitionRepository implements SLODefinitionRepository {
    private soClient;
    private logger;
    constructor(soClient: SavedObjectsClientContract, logger: Logger);
    create(slo: SLODefinition): Promise<SLODefinition>;
    update(slo: SLODefinition): Promise<SLODefinition>;
    findById(id: string): Promise<SLODefinition>;
    deleteById(id: string, { ignoreNotFound }: {
        ignoreNotFound?: boolean | undefined;
    }): Promise<void>;
    findAllByIds(ids: string[]): Promise<SLODefinition[]>;
    search({ search, pagination, filters, }: SearchParams): Promise<Paginated<SLODefinition>>;
    private toSLO;
    private getDashboardsIds;
    private isSLO;
    private toStoredSLO;
}
export {};
