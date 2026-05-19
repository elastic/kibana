import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
export interface TopNFunctionsLocatorParams extends SerializableRecord {
    kuery?: string;
    rangeFrom?: string;
    rangeTo?: string;
}
export type TopNFunctionsLocator = LocatorPublic<TopNFunctionsLocatorParams>;
export declare class TopNFunctionsLocatorDefinition implements LocatorDefinition<TopNFunctionsLocatorParams> {
    readonly id = "topNFunctionsLocator";
    readonly getLocation: ({ rangeFrom, rangeTo, kuery, }: TopNFunctionsLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
