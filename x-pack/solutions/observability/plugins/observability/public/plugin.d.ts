import type { CasesPublicStart, CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient, CoreSetup, CoreStart, Plugin as PluginClass, PluginInitializerContext, ToastsStart } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { ObservabilitySharedPluginSetup, ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { type TriggersAndActionsUIPublicPluginSetup, type TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { ObservabilityAIAssistantPublicSetup, ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { StreamsPluginStart, StreamsPluginSetup } from '@kbn/streams-plugin/public';
import type { IngestHubStart } from '@kbn/ingest-hub-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ObservabilityAgentBuilderPluginPublicStart } from '@kbn/observability-agent-builder-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public/types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { registerDataHandler } from './context/has_data_context/data_handler';
export interface ConfigSchema {
    unsafe: {
        alertDetails: {
            logs?: {
                enabled: boolean;
            };
            uptime: {
                enabled: boolean;
            };
            observability?: {
                enabled: boolean;
            };
        };
        thresholdRule?: {
            enabled: boolean;
        };
        ruleFormV2?: {
            enabled: boolean;
        };
    };
    managedOtlpServiceUrl: string;
}
export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;
export interface ObservabilityPublicPluginsSetup {
    data: DataPublicPluginSetup;
    fieldFormats: FieldFormatsSetup;
    observabilityShared: ObservabilitySharedPluginSetup;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
    share: SharePluginSetup;
    triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
    home?: HomePublicPluginSetup;
    usageCollection: UsageCollectionSetup;
    embeddable: EmbeddableSetup;
    uiActions: UiActionsSetup;
    licensing: LicensingPluginSetup;
    serverless?: ServerlessPluginSetup;
    presentationUtil?: PresentationUtilPluginStart;
    streams?: StreamsPluginSetup;
    cases?: CasesPublicSetup;
}
export interface ObservabilityPublicPluginsStart {
    actionTypeRegistry: ActionTypeRegistryContract;
    cases?: CasesPublicStart;
    charts: ChartsPluginStart;
    contentManagement: ContentManagementPublicStart;
    dashboard: DashboardStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    dataViewEditor: DataViewEditorStart;
    discover: DiscoverStart;
    embeddable: EmbeddableStart;
    exploratoryView?: ExploratoryViewPublicStart;
    expressions: ExpressionsStart;
    fieldFormats: FieldFormatsStart;
    lens: LensPublicStart;
    licensing: LicensingPluginStart;
    licenseManagement?: LicenseManagementUIPluginSetup;
    logsDataAccess: LogsDataAccessPluginStart;
    navigation: NavigationPublicPluginStart;
    observabilityShared: ObservabilitySharedPluginStart;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
    ruleTypeRegistry: RuleTypeRegistryContract;
    security: SecurityPluginStart;
    share: SharePluginStart;
    spaces?: SpacesPluginStart;
    triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
    usageCollection: UsageCollectionSetup;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    home?: HomePublicPluginStart;
    cloud?: CloudStart;
    aiops: AiopsPluginStart;
    serverless?: ServerlessPluginStart;
    uiSettings: IUiSettingsClient;
    uiActions: UiActionsStart;
    presentationUtil?: PresentationUtilPluginStart;
    theme: CoreStart['theme'];
    dataViewFieldEditor: DataViewFieldEditorStart;
    toastNotifications: ToastsStart;
    streams: StreamsPluginStart;
    fieldsMetadata: FieldsMetadataPublicStart;
    inspector: InspectorPluginStart;
    savedObjectsTagging: SavedObjectTaggingPluginStart;
    agentBuilder?: AgentBuilderPluginStart;
    observabilityAgentBuilder?: ObservabilityAgentBuilderPluginPublicStart;
    cps?: CPSPluginStart;
    ingestHub?: IngestHubStart;
}
export type ObservabilityPublicStart = ReturnType<Plugin['start']>;
export declare class Plugin implements PluginClass<ObservabilityPublicSetup, ObservabilityPublicStart, ObservabilityPublicPluginsSetup, ObservabilityPublicPluginsStart> {
    private readonly initContext;
    private readonly appUpdater$;
    private observabilityRuleTypeRegistry;
    private telemetry;
    private readonly deepLinks;
    constructor(initContext: PluginInitializerContext<ConfigSchema>);
    private canUseHistory;
    setup(coreSetup: CoreSetup<ObservabilityPublicPluginsStart, ObservabilityPublicStart>, pluginsSetup: ObservabilityPublicPluginsSetup): {
        dashboard: {
            register: typeof registerDataHandler;
        };
        observabilityRuleTypeRegistry: {
            register: (type: import("./rules/create_observability_rule_type_registry").ObservabilityRuleTypeModel<any>) => void;
            getFormatter: (typeId: string) => import("./rules/create_observability_rule_type_registry").ObservabilityRuleTypeFormatter | undefined;
            list: () => string[];
        };
        useRulesLink: (options?: import("@kbn/observability-shared-plugin/public").UseLinkPropsOptions) => import("../../observability_shared/public/hooks/use_link_props").LinkProps;
        config: ConfigSchema;
    };
    start(coreStart: CoreStart, pluginsStart: ObservabilityPublicPluginsStart): {
        config: ConfigSchema;
        observabilityRuleTypeRegistry: {
            register: (type: import("./rules/create_observability_rule_type_registry").ObservabilityRuleTypeModel<any>) => void;
            getFormatter: (typeId: string) => import("./rules/create_observability_rule_type_registry").ObservabilityRuleTypeFormatter | undefined;
            list: () => string[];
        };
        useRulesLink: (options?: import("@kbn/observability-shared-plugin/public").UseLinkPropsOptions) => import("../../observability_shared/public/hooks/use_link_props").LinkProps;
    };
}
