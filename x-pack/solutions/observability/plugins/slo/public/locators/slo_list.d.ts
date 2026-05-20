import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { type SloListLocatorParams } from '@kbn/deeplinks-observability';
export declare class SloListLocatorDefinition implements LocatorDefinition<SloListLocatorParams> {
    readonly id = "SLO_LIST_LOCATOR";
    readonly getLocation: ({ kqlQuery, filters }: SloListLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
