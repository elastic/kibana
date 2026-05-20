import type { SavedObjectsClientContract } from '@kbn/core/server';
export interface CompositeSLOSuggestionsResponse {
    tags: Array<{
        label: string;
        value: string;
        count: number;
    }>;
}
export declare class GetCompositeSLOSuggestions {
    private soClient;
    constructor(soClient: SavedObjectsClientContract);
    execute(): Promise<CompositeSLOSuggestionsResponse>;
}
