import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
export interface FlamegraphLocatorParams extends SerializableRecord {
    kuery?: string;
    rangeFrom?: string;
    rangeTo?: string;
}
export type FlamegraphLocator = LocatorPublic<FlamegraphLocatorParams>;
export declare class FlamegraphLocatorDefinition implements LocatorDefinition<FlamegraphLocatorParams> {
    readonly id = "flamegraphLocator";
    readonly getLocation: ({ rangeFrom, rangeTo, kuery }: FlamegraphLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
