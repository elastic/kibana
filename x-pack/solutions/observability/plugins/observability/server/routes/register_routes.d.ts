import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { RuleDataPluginService, RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AlertDetailsContextualInsightsService } from '../services';
import type { AbstractObservabilityServerRouteRepository } from './types';
interface RegisterRoutes {
    core: CoreSetup;
    repository: AbstractObservabilityServerRouteRepository;
    logger: Logger;
    dependencies: RegisterRoutesDependencies;
    isDev: boolean;
}
export interface RegisterRoutesDependencies {
    pluginsSetup: {
        core: CoreSetup;
    };
    dataViews: DataViewsServerPluginStart;
    spaces?: SpacesPluginStart;
    ruleDataService: RuleDataPluginService;
    ruleRegistry: RuleRegistryPluginStartContract;
    dashboard: DashboardPluginStart;
    assistant: {
        alertDetailsContextualInsightsService: AlertDetailsContextualInsightsService;
    };
    getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClientApi>;
}
export declare function registerRoutes({ repository, core, logger, dependencies, isDev }: RegisterRoutes): void;
export {};
