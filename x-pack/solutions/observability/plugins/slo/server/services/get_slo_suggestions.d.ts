import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { GetSLOSuggestionsResponse } from '@kbn/slo-schema';
export declare class GetSLOSuggestions {
    private soClient;
    constructor(soClient: SavedObjectsClientContract);
    execute(): Promise<GetSLOSuggestionsResponse>;
}
