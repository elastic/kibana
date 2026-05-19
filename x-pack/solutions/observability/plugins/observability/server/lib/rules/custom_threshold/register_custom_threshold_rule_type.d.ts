import type { IRuleTypeAlerts, GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import type { CoreSetup, IBasePath, Logger } from '@kbn/core/server';
import type { LicenseType } from '@kbn/licensing-types';
import type { EsQueryRuleParamsExtractedParams } from '@kbn/stack-alerts-plugin/server/rule_types/es_query/rule_type_params';
import type { CustomThresholdLocators } from './custom_threshold_executor';
import type { ObservabilityConfig } from '../../..';
import type { CustomThresholdAlert } from './types';
export declare const MetricsRulesTypeAlertDefinition: IRuleTypeAlerts<CustomThresholdAlert>;
export declare function thresholdRuleType(core: CoreSetup, basePath: IBasePath, config: ObservabilityConfig, logger: Logger, locators: CustomThresholdLocators): {
    id: string;
    name: string;
    validate: {
        params: import("@kbn/config-schema").ObjectType<{
            criteria: import("@kbn/config-schema").Type<Readonly<{
                label?: string | undefined;
                aggType?: "custom" | undefined;
                equation?: string | undefined;
            } & {
                threshold: number[];
                metrics: (Readonly<{
                    filter?: string | undefined;
                } & {
                    name: string;
                    field: string;
                    aggType: string;
                }> | Readonly<{
                    filter?: string | undefined;
                } & {
                    name: string;
                    field: never;
                    aggType: "count";
                }>)[];
                metric: never;
                comparator: string;
                timeUnit: string;
                timeSize: number;
            }>[]>;
            groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
            alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
            alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
            noDataBehavior: import("@kbn/config-schema").Type<"alertOnNoData" | "recover" | "remainActive" | undefined>;
            searchConfiguration: import("@kbn/config-schema").ObjectType<{
                index: import("@kbn/config-schema").Type<string | Readonly<{
                    fields?: Record<string, Readonly<{
                        count?: number | undefined;
                        format?: Readonly<{
                            id?: string | undefined;
                            params?: any;
                        } & {}> | undefined;
                        script?: string | undefined;
                        subType?: Readonly<{
                            nested?: Readonly<{} & {
                                path: string;
                            }> | undefined;
                            multi?: Readonly<{} & {
                                parent: string;
                            }> | undefined;
                        } & {}> | undefined;
                        scripted?: boolean | undefined;
                        esTypes?: string[] | undefined;
                        searchable?: boolean | undefined;
                        customLabel?: string | undefined;
                        runtimeField?: Readonly<{
                            format?: Readonly<{
                                id?: string | undefined;
                                params?: any;
                            } & {}> | undefined;
                            script?: Readonly<{} & {
                                source: string;
                            }> | undefined;
                            customLabel?: string | undefined;
                            customDescription?: string | undefined;
                            popularity?: number | undefined;
                        } & {
                            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                        }> | Readonly<{
                            fields?: Record<string, Readonly<{
                                format?: Readonly<{
                                    id?: string | undefined;
                                    params?: any;
                                } & {}> | undefined;
                                customLabel?: string | undefined;
                                customDescription?: string | undefined;
                                popularity?: number | undefined;
                            } & {
                                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                            }>> | undefined;
                            script?: Readonly<{} & {
                                source: string;
                            }> | undefined;
                        } & {
                            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                        }> | undefined;
                        customDescription?: string | undefined;
                        aggregatable?: boolean | undefined;
                        readFromDocValues?: boolean | undefined;
                        shortDotsEnable?: boolean | undefined;
                    } & {
                        name: string;
                        type: string;
                    }>> | undefined;
                    name?: string | undefined;
                    id?: string | undefined;
                    type?: string | undefined;
                    version?: string | undefined;
                    namespaces?: string[] | undefined;
                    managed?: boolean | undefined;
                    fieldFormats?: Record<string, Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}>> | undefined;
                    timeFieldName?: string | undefined;
                    sourceFilters?: Readonly<{
                        clientId?: string | number | undefined;
                    } & {
                        value: string;
                    }>[] | undefined;
                    typeMeta?: Readonly<{} & {}> | undefined;
                    runtimeFieldMap?: Record<string, Readonly<{
                        format?: Readonly<{
                            id?: string | undefined;
                            params?: any;
                        } & {}> | undefined;
                        script?: Readonly<{} & {
                            source: string;
                        }> | undefined;
                        customLabel?: string | undefined;
                        customDescription?: string | undefined;
                        popularity?: number | undefined;
                    } & {
                        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                    }> | Readonly<{
                        fields?: Record<string, Readonly<{
                            format?: Readonly<{
                                id?: string | undefined;
                                params?: any;
                            } & {}> | undefined;
                            customLabel?: string | undefined;
                            customDescription?: string | undefined;
                            popularity?: number | undefined;
                        } & {
                            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                        }>> | undefined;
                        script?: Readonly<{} & {
                            source: string;
                        }> | undefined;
                    } & {
                        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                    }>> | undefined;
                    fieldAttrs?: Record<string, Readonly<{
                        count?: number | undefined;
                        customLabel?: string | undefined;
                        customDescription?: string | undefined;
                    } & {}>> | undefined;
                    allowNoIndex?: boolean | undefined;
                    allowHidden?: boolean | undefined;
                } & {
                    title: string;
                }>>;
                query: import("@kbn/config-schema").ObjectType<{
                    language: import("@kbn/config-schema").Type<string>;
                    query: import("@kbn/config-schema").Type<string>;
                }>;
                filter: import("@kbn/config-schema").Type<Readonly<{
                    query?: Record<string, any> | undefined;
                } & {
                    meta: Record<string, any>;
                }>[] | undefined>;
            }>;
        }>;
    };
    schemas: {
        params: {
            type: "config-schema";
            schema: import("@kbn/config-schema").ObjectType<{
                criteria: import("@kbn/config-schema").Type<Readonly<{
                    label?: string | undefined;
                    aggType?: "custom" | undefined;
                    equation?: string | undefined;
                } & {
                    threshold: number[];
                    metrics: (Readonly<{
                        filter?: string | undefined;
                    } & {
                        name: string;
                        field: string;
                        aggType: string;
                    }> | Readonly<{
                        filter?: string | undefined;
                    } & {
                        name: string;
                        field: never;
                        aggType: "count";
                    }>)[];
                    metric: never;
                    comparator: string;
                    timeUnit: string;
                    timeSize: number;
                }>[]>;
                groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
                alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
                alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
                noDataBehavior: import("@kbn/config-schema").Type<"alertOnNoData" | "recover" | "remainActive" | undefined>;
                searchConfiguration: import("@kbn/config-schema").ObjectType<{
                    index: import("@kbn/config-schema").Type<string | Readonly<{
                        fields?: Record<string, Readonly<{
                            count?: number | undefined;
                            format?: Readonly<{
                                id?: string | undefined;
                                params?: any;
                            } & {}> | undefined;
                            script?: string | undefined;
                            subType?: Readonly<{
                                nested?: Readonly<{} & {
                                    path: string;
                                }> | undefined;
                                multi?: Readonly<{} & {
                                    parent: string;
                                }> | undefined;
                            } & {}> | undefined;
                            scripted?: boolean | undefined;
                            esTypes?: string[] | undefined;
                            searchable?: boolean | undefined;
                            customLabel?: string | undefined;
                            runtimeField?: Readonly<{
                                format?: Readonly<{
                                    id?: string | undefined;
                                    params?: any;
                                } & {}> | undefined;
                                script?: Readonly<{} & {
                                    source: string;
                                }> | undefined;
                                customLabel?: string | undefined;
                                customDescription?: string | undefined;
                                popularity?: number | undefined;
                            } & {
                                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                            }> | Readonly<{
                                fields?: Record<string, Readonly<{
                                    format?: Readonly<{
                                        id?: string | undefined;
                                        params?: any;
                                    } & {}> | undefined;
                                    customLabel?: string | undefined;
                                    customDescription?: string | undefined;
                                    popularity?: number | undefined;
                                } & {
                                    type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                                }>> | undefined;
                                script?: Readonly<{} & {
                                    source: string;
                                }> | undefined;
                            } & {
                                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                            }> | undefined;
                            customDescription?: string | undefined;
                            aggregatable?: boolean | undefined;
                            readFromDocValues?: boolean | undefined;
                            shortDotsEnable?: boolean | undefined;
                        } & {
                            name: string;
                            type: string;
                        }>> | undefined;
                        name?: string | undefined;
                        id?: string | undefined;
                        type?: string | undefined;
                        version?: string | undefined;
                        namespaces?: string[] | undefined;
                        managed?: boolean | undefined;
                        fieldFormats?: Record<string, Readonly<{
                            id?: string | undefined;
                            params?: any;
                        } & {}>> | undefined;
                        timeFieldName?: string | undefined;
                        sourceFilters?: Readonly<{
                            clientId?: string | number | undefined;
                        } & {
                            value: string;
                        }>[] | undefined;
                        typeMeta?: Readonly<{} & {}> | undefined;
                        runtimeFieldMap?: Record<string, Readonly<{
                            format?: Readonly<{
                                id?: string | undefined;
                                params?: any;
                            } & {}> | undefined;
                            script?: Readonly<{} & {
                                source: string;
                            }> | undefined;
                            customLabel?: string | undefined;
                            customDescription?: string | undefined;
                            popularity?: number | undefined;
                        } & {
                            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                        }> | Readonly<{
                            fields?: Record<string, Readonly<{
                                format?: Readonly<{
                                    id?: string | undefined;
                                    params?: any;
                                } & {}> | undefined;
                                customLabel?: string | undefined;
                                customDescription?: string | undefined;
                                popularity?: number | undefined;
                            } & {
                                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                            }>> | undefined;
                            script?: Readonly<{} & {
                                source: string;
                            }> | undefined;
                        } & {
                            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
                        }>> | undefined;
                        fieldAttrs?: Record<string, Readonly<{
                            count?: number | undefined;
                            customLabel?: string | undefined;
                            customDescription?: string | undefined;
                        } & {}>> | undefined;
                        allowNoIndex?: boolean | undefined;
                        allowHidden?: boolean | undefined;
                    } & {
                        title: string;
                    }>>;
                    query: import("@kbn/config-schema").ObjectType<{
                        language: import("@kbn/config-schema").Type<string>;
                        query: import("@kbn/config-schema").Type<string>;
                    }>;
                    filter: import("@kbn/config-schema").Type<Readonly<{
                        query?: Record<string, any> | undefined;
                    } & {
                        meta: Record<string, any>;
                    }>[] | undefined>;
                }>;
            }>;
        };
    };
    defaultActionGroupId: string;
    actionGroups: {
        id: string;
        name: string;
    }[];
    minimumLicenseRequired: LicenseType;
    isExportable: boolean;
    executor: (options: import("@kbn/alerting-plugin/server").RuleExecutorOptions<import("./types").CustomThresholdRuleTypeParams, import("./types").CustomThresholdRuleTypeState, import("./types").CustomThresholdAlertState, import("./types").CustomThresholdAlertContext, import("./types").CustomThresholdSpecificActionGroups, CustomThresholdAlert>) => Promise<{
        state: {
            lastRunTimestamp: number;
            missingGroups: import("./lib/check_missing_group").MissingGroupsRecord[];
            groupBy: string | string[] | undefined;
            searchConfiguration: import("../../../../common/custom_threshold_rule/types").SearchConfigurationWithExtractedReferenceType;
        };
    }>;
    doesSetRecoveryContext: boolean;
    actionVariables: {
        context: ({
            name: string;
            description: string;
            usesPublicBaseUrl?: undefined;
        } | {
            name: string;
            description: string;
            usesPublicBaseUrl: boolean;
        })[];
    };
    useSavedObjectReferences: {
        extractReferences: (params: any) => {
            params: EsQueryRuleParamsExtractedParams;
            references: import("@kbn/core/server").SavedObjectReference[];
        };
        injectReferences: (params: any, references: any) => any;
    };
    category: string;
    producer: string;
    solution: "observability";
    alerts: IRuleTypeAlerts<CustomThresholdAlert>;
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) => string;
    queryInspector: import("@kbn/alerting-plugin/server").RuleQueryInspectorFn;
};
