import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { type Paginated, type Pagination } from '@kbn/slo-schema';
import type { SLOTemplate } from '../domain/models';
interface SearchParams {
    pagination: Pagination;
    search?: string;
    tags?: string[];
}
export interface SLOTemplateRepository {
    findById(templateId: string): Promise<SLOTemplate>;
    search(params: SearchParams): Promise<Paginated<SLOTemplate>>;
    tags(): Promise<string[]>;
}
export declare class DefaultSLOTemplateRepository implements SLOTemplateRepository {
    private soClient;
    constructor(soClient: SavedObjectsClientContract);
    findById(templateId: string): Promise<SLOTemplate>;
    search({ search, pagination, tags }: SearchParams): Promise<Paginated<SLOTemplate>>;
    tags(): Promise<string[]>;
    private toSloTemplate;
}
export {};
