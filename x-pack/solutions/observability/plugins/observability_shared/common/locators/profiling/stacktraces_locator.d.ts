import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { TopNType } from '@kbn/profiling-utils';
export interface StacktracesLocatorParams extends SerializableRecord {
    kuery?: string;
    rangeFrom?: string;
    rangeTo?: string;
    type?: TopNType;
}
export type StacktracesLocator = LocatorPublic<StacktracesLocatorParams>;
export declare class StacktracesLocatorDefinition implements LocatorDefinition<StacktracesLocatorParams> {
    readonly id = "stacktracesLocator";
    readonly getLocation: ({ rangeFrom, rangeTo, kuery, type, }: StacktracesLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
