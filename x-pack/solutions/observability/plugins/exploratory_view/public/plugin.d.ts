import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreSetup, CoreStart, Plugin as PluginClass, PluginInitializerContext } from '@kbn/core/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { TriggersAndActionsUIPublicPluginSetup, TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/exploratory_view_url';
import { registerDataHandler } from './data_handler';
export interface ExploratoryViewPublicPluginsSetup {
    data: DataPublicPluginSetup;
    share: SharePluginSetup;
    triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
    usageCollection: UsageCollectionSetup;
    home?: HomePublicPluginSetup;
}
export interface ExploratoryViewPublicPluginsStart {
    cases: CasesPublicStart;
    charts: ChartsPluginStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    discover: DiscoverStart;
    embeddable: EmbeddableStart;
    lens: LensPublicStart;
    licensing: LicensingPluginStart;
    observabilityShared: ObservabilitySharedPluginStart;
    security: SecurityPluginStart;
    share: SharePluginStart;
    spaces?: SpacesPluginStart;
    triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
    usageCollection: UsageCollectionSetup;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    home?: HomePublicPluginStart;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
}
export type ExploratoryViewPublicSetup = ReturnType<Plugin['setup']>;
export type ExploratoryViewPublicStart = ReturnType<Plugin['start']>;
export declare class Plugin implements PluginClass<ExploratoryViewPublicSetup, ExploratoryViewPublicStart, ExploratoryViewPublicPluginsSetup, ExploratoryViewPublicPluginsStart> {
    private readonly initContext;
    private readonly appUpdater$;
    private analyticsService?;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<ExploratoryViewPublicPluginsStart, ExploratoryViewPublicStart>, plugins: ExploratoryViewPublicPluginsSetup): {
        register: typeof registerDataHandler;
    };
    start(coreStart: CoreStart, pluginsStart: ExploratoryViewPublicPluginsStart): {
        createExploratoryViewUrl: typeof createExploratoryViewUrl;
        getAppDataView: (appId: import("./components/shared/exploratory_view/types").AppDataType, indexPattern?: string) => Promise<import("@kbn/data-views-plugin/public").DataView | null | undefined>;
        ExploratoryViewEmbeddable: (props: import(".").ExploratoryEmbeddableProps) => import("react").JSX.Element | null;
    };
}
