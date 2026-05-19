import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { updateGlobalNavigation } from './services/update_global_navigation';
import { type AssetDetailsFlyoutLocator, type AssetDetailsLocator, type InventoryLocator, type HostsLocator, type FlamegraphLocator, type StacktracesLocator, type TopNFunctionsLocator, type ServiceOverviewLocator, type TransactionDetailsByNameLocator, type MetricsExplorerLocator, type TransactionDetailsByTraceIdLocator } from '../common';
import type { DependencyOverviewLocator } from '../common/locators/apm/dependency_overview_locator';
export interface ObservabilitySharedSetup {
    share: SharePluginSetup;
}
export interface ObservabilitySharedStart {
    spaces?: SpacesPluginStart;
    embeddable: EmbeddableStart;
    share: SharePluginStart;
    agentBuilder?: AgentBuilderPluginStart;
}
export type ObservabilitySharedPluginSetup = ReturnType<ObservabilitySharedPlugin['setup']>;
export type ObservabilitySharedPluginStart = ReturnType<ObservabilitySharedPlugin['start']>;
export type ProfilingLocators = ObservabilitySharedPluginSetup['locators']['profiling'];
interface ObservabilitySharedLocators {
    infra: {
        assetDetailsLocator: AssetDetailsLocator;
        assetDetailsFlyoutLocator: AssetDetailsFlyoutLocator;
        hostsLocator: HostsLocator;
        inventoryLocator: InventoryLocator;
        metricsExplorerLocator: MetricsExplorerLocator;
    };
    profiling: {
        flamegraphLocator: FlamegraphLocator;
        topNFunctionsLocator: TopNFunctionsLocator;
        stacktracesLocator: StacktracesLocator;
    };
    apm: {
        serviceOverview: ServiceOverviewLocator;
        dependencyOverview: DependencyOverviewLocator;
        transactionDetailsByName: TransactionDetailsByNameLocator;
        transactionDetailsByTraceId: TransactionDetailsByTraceIdLocator;
    };
}
export declare class ObservabilitySharedPlugin implements Plugin {
    private readonly navigationRegistry;
    private isSidebarEnabled$;
    constructor();
    setup(coreSetup: CoreSetup, pluginsSetup: ObservabilitySharedSetup): {
        registerProfilingComponent: <T>(key: string, component: React.FC<T>) => void;
        locators: ObservabilitySharedLocators;
        navigation: {
            registerSections: (sections$: import("rxjs").Observable<import(".").NavigationSection[]>) => void;
        };
    };
    start(core: CoreStart, plugins: ObservabilitySharedStart): {
        locators: ObservabilitySharedLocators;
        navigation: {
            PageTemplate: (pageTemplateProps: import("./components/page_template").LazyObservabilityPageTemplateProps) => import("react").JSX.Element;
            registerSections: (sections$: import("rxjs").Observable<import(".").NavigationSection[]>) => void;
        };
        updateGlobalNavigation: typeof updateGlobalNavigation;
    };
    stop(): void;
    private createLocators;
}
export {};
