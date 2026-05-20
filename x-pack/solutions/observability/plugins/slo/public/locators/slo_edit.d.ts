import type { RecursivePartial } from '@elastic/charts';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { CreateSLOInput } from '@kbn/slo-schema';
export type SloEditLocatorParams = RecursivePartial<CreateSLOInput>;
export declare class SloEditLocatorDefinition implements LocatorDefinition<SloEditLocatorParams> {
    readonly id = "SLO_EDIT_LOCATOR";
    readonly getLocation: (slo: SloEditLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
