import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { type SloDetailsHistoryLocatorParams } from '@kbn/deeplinks-observability';
export declare class SloDetailsHistoryLocatorDefinition implements LocatorDefinition<SloDetailsHistoryLocatorParams> {
    readonly id = "SLO_DETAILS_HISTORY_LOCATOR";
    readonly getLocation: ({ id, instanceId, encodedAppState, }: SloDetailsHistoryLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
