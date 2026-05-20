import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DependencyOverviewParams } from '@kbn/deeplinks-observability/locators';
export type DependencyOverviewLocator = LocatorPublic<DependencyOverviewParams>;
export declare class DependencyOverviewLocatorDefinition implements LocatorDefinition<DependencyOverviewParams> {
    readonly id = "dependencyOverviewLocator";
    readonly getLocation: ({ rangeFrom, rangeTo, dependencyName, environment, }: DependencyOverviewParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
