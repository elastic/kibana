import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { type SloDetailsLocatorParams } from '@kbn/deeplinks-observability';
export declare class SloDetailsLocatorDefinition implements LocatorDefinition<SloDetailsLocatorParams> {
    readonly id = "SLO_DETAILS_LOCATOR";
    readonly getLocation: ({ sloId, instanceId, tabId }: SloDetailsLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
