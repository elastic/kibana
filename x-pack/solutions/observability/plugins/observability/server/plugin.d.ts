import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { RuleRegistryPluginSetupContract, RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { PluginSetup as ESQLSetup } from '@kbn/esql/server';
import { AlertDetailsContextualInsightsService } from './services';
export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;
interface PluginSetup {
    alerting: AlertingServerSetup;
    cases?: CasesServerSetup;
    features: FeaturesPluginSetup;
    ruleRegistry: RuleRegistryPluginSetupContract;
    share: SharePluginSetup;
    spaces?: SpacesPluginSetup;
    usageCollection?: UsageCollectionSetup;
    cloud?: CloudSetup;
    contentManagement: ContentManagementServerSetup;
    esql: ESQLSetup;
}
interface PluginStart {
    alerting: AlertingServerStart;
    data: DataPluginStart;
    spaces?: SpacesPluginStart;
    dataViews: DataViewsServerPluginStart;
    ruleRegistry: RuleRegistryPluginStartContract;
    dashboard: DashboardPluginStart;
}
export declare class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup, void, PluginSetup, PluginStart> {
    private readonly initContext;
    private logger;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<PluginStart, void>, plugins: PluginSetup): {
        getAlertDetailsConfig(): Readonly<{} & {
            uptime: Readonly<{} & {
                enabled: boolean;
            }>;
            metrics: Readonly<{} & {
                enabled: boolean;
            }>;
            logs: Readonly<{} & {
                enabled: boolean;
            }>;
            observability: Readonly<{} & {
                enabled: boolean;
            }>;
        }>;
        getScopedAnnotationsClient: (requestContext: {
            core: Promise<{
                elasticsearch: {
                    client: import("@kbn/core/server").IScopedClusterClient;
                };
            }>;
            licensing: Promise<import("../../../../../platform/plugins/shared/licensing/server").LicensingApiRequestHandlerContext>;
        }, request: import("@kbn/core/server").KibanaRequest<unknown, unknown, unknown, any>) => Promise<{
            index: string;
            create: (createParams: import("../common/annotations").CreateAnnotationParams) => Promise<{
                _id: string;
                _index: string;
                _source: import("../common/annotations").Annotation;
            }>;
            update: (updateParams: import("../common/annotations").Annotation) => Promise<{
                _id: string;
                _index: string;
                _source: import("../common/annotations").Annotation;
            }>;
            getById: (getByIdParams: import("../common/annotations").GetByIdAnnotationParams) => Promise<{
                _source: {
                    annotation: {
                        title: string;
                        type?: string | undefined;
                        style?: {
                            icon?: string | undefined;
                            color?: string | undefined;
                            line?: {
                                width?: number | undefined;
                                style?: "dashed" | "dotted" | "solid" | undefined;
                                iconPosition?: "top" | "bottom" | undefined;
                                textDecoration?: "name" | "none" | undefined;
                            } | undefined;
                            rect?: {
                                fill?: "inside" | "outside" | undefined;
                            } | undefined;
                        } | undefined;
                    };
                    id: string;
                    '@timestamp': string;
                    message: string;
                    event?: ({
                        start: string;
                    } & {
                        end?: string | undefined;
                    }) | undefined;
                    tags?: string[] | undefined;
                    service?: {
                        name?: string | undefined;
                        environment?: string | undefined;
                        version?: string | undefined;
                    } | undefined;
                    monitor?: {
                        id?: string | undefined;
                    } | undefined;
                    slo?: ({
                        id: string;
                    } & {
                        instanceId?: string | undefined;
                    }) | undefined;
                    host?: {
                        name?: string | undefined;
                    } | undefined;
                };
                _index: import("@elastic/elasticsearch/lib/api/types").IndexName;
                _id?: import("@elastic/elasticsearch/lib/api/types").Id;
                _score?: import("@elastic/elasticsearch/lib/api/types").double | null;
                _explanation?: import("@elastic/elasticsearch/lib/api/types").ExplainExplanation;
                fields?: Record<string, any>;
                highlight?: Record<string, string[]>;
                inner_hits?: Record<string, import("@elastic/elasticsearch/lib/api/types").SearchInnerHitsResult>;
                matched_queries?: string[] | Record<string, import("@elastic/elasticsearch/lib/api/types").double>;
                _nested?: import("@elastic/elasticsearch/lib/api/types").SearchNestedIdentity;
                _ignored?: string[];
                ignored_field_values?: Record<string, any[]>;
                _shard?: string;
                _node?: string;
                _routing?: string;
                _rank?: import("@elastic/elasticsearch/lib/api/types").integer;
                _seq_no?: import("@elastic/elasticsearch/lib/api/types").SequenceNumber;
                _primary_term?: import("@elastic/elasticsearch/lib/api/types").long;
                _version?: import("@elastic/elasticsearch/lib/api/types").VersionNumber;
                sort?: import("@elastic/elasticsearch/lib/api/types").SortResults;
            }>;
            find: (findParams: import("../common/annotations").FindAnnotationParams) => Promise<{
                items: {
                    id: string | undefined;
                    annotation: {
                        title: string;
                        type?: string | undefined;
                        style?: {
                            icon?: string | undefined;
                            color?: string | undefined;
                            line?: {
                                width?: number | undefined;
                                style?: "dashed" | "dotted" | "solid" | undefined;
                                iconPosition?: "top" | "bottom" | undefined;
                                textDecoration?: "name" | "none" | undefined;
                            } | undefined;
                            rect?: {
                                fill?: "inside" | "outside" | undefined;
                            } | undefined;
                        } | undefined;
                    };
                    '@timestamp': string;
                    message: string;
                    event?: ({
                        start: string;
                    } & {
                        end?: string | undefined;
                    }) | undefined;
                    tags?: string[] | undefined;
                    service?: {
                        name?: string | undefined;
                        environment?: string | undefined;
                        version?: string | undefined;
                    } | undefined;
                    monitor?: {
                        id?: string | undefined;
                    } | undefined;
                    slo?: ({
                        id: string;
                    } & {
                        instanceId?: string | undefined;
                    }) | undefined;
                    host?: {
                        name?: string | undefined;
                    } | undefined;
                }[];
                total: number;
            }>;
            delete: (deleteParams: import("../common/annotations").DeleteAnnotationParams) => Promise<import("@elastic/elasticsearch/lib/api/types").DeleteByQueryResponse>;
            permissions: () => Promise<{
                index: string;
                hasGoldLicense: boolean;
            }>;
        } | undefined>;
        alertDetailsContextualInsightsService: AlertDetailsContextualInsightsService;
        alertsLocator: import("@kbn/share-plugin/common").LocatorPublic<import("../common").AlertsLocatorParams>;
        managedOtlpServiceUrl: string;
    };
    start(core: CoreStart, plugins: PluginStart): void;
    stop(): void;
}
export {};
