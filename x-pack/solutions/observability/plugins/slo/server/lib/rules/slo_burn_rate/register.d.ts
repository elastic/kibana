import type { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import type { LicenseType } from '@kbn/licensing-types';
import type { IBasePath } from '@kbn/core/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
export declare function sloBurnRateRuleType(basePath: IBasePath, alertsLocator?: LocatorPublic<AlertsLocatorParams>): {
    id: string;
    name: string;
    validate: {
        params: import("@kbn/config-schema").ObjectType<{
            sloId: import("@kbn/config-schema").Type<string>;
            windows: import("@kbn/config-schema").Type<Readonly<{} & {
                id: string;
                actionGroup: string;
                burnRateThreshold: number;
                maxBurnRateThreshold: number | null;
                longWindow: Readonly<{} & {
                    value: number;
                    unit: string;
                }>;
                shortWindow: Readonly<{} & {
                    value: number;
                    unit: string;
                }>;
            }>[]>;
            dependencies: import("@kbn/config-schema").Type<Readonly<{} & {
                ruleId: string;
                actionGroupsToSuppressOn: string[];
            }>[] | undefined>;
        }>;
    };
    schemas: {
        params: {
            type: "config-schema";
            schema: import("@kbn/config-schema").ObjectType<{
                sloId: import("@kbn/config-schema").Type<string>;
                windows: import("@kbn/config-schema").Type<Readonly<{} & {
                    id: string;
                    actionGroup: string;
                    burnRateThreshold: number;
                    maxBurnRateThreshold: number | null;
                    longWindow: Readonly<{} & {
                        value: number;
                        unit: string;
                    }>;
                    shortWindow: Readonly<{} & {
                        value: number;
                        unit: string;
                    }>;
                }>[]>;
                dependencies: import("@kbn/config-schema").Type<Readonly<{} & {
                    ruleId: string;
                    actionGroupsToSuppressOn: string[];
                }>[] | undefined>;
            }>;
        };
    };
    defaultActionGroupId: string;
    actionGroups: {
        id: string;
        name: string;
    }[];
    category: string;
    producer: string;
    solution: "observability";
    minimumLicenseRequired: LicenseType;
    isExportable: boolean;
    executor: (options: import("@kbn/alerting-plugin/server").RuleExecutorOptions<import("./types").BurnRateRuleParams, import("./types").BurnRateRuleTypeState, import("./types").BurnRateAlertState, import("./types").BurnRateAlertContext, import("./types").BurnRateAllowedActionGroups, import("./executor").BurnRateAlert>) => ReturnType<import("@kbn/alerting-plugin/server").ExecutorType<import("./types").BurnRateRuleParams, import("./types").BurnRateRuleTypeState, import("./types").BurnRateAlertState, import("./types").BurnRateAlertContext, import("./types").BurnRateAllowedActionGroups>>;
    doesSetRecoveryContext: boolean;
    actionVariables: {
        context: {
            name: string;
            description: string;
        }[];
    };
    alerts: {
        context: string;
        mappings: {
            fieldMap: {
                "slo.id": {
                    type: string;
                    array: boolean;
                    required: boolean;
                };
                "slo.revision": {
                    type: string;
                    array: boolean;
                    required: boolean;
                };
                "slo.instanceId": {
                    type: string;
                    array: boolean;
                    required: boolean;
                };
                "slo.dataViewId": {
                    type: string;
                    array: boolean;
                    required: boolean;
                };
                "kibana.alert.evaluation.threshold": {
                    readonly type: "scaled_float";
                    readonly scaling_factor: 100;
                    readonly required: false;
                };
                "kibana.alert.evaluation.time_range": {
                    readonly type: "date_range";
                    readonly array: false;
                    readonly required: false;
                };
                "kibana.alert.evaluation.value": {
                    readonly type: "scaled_float";
                    readonly scaling_factor: 100;
                    readonly required: false;
                };
                "kibana.alert.context": {
                    readonly type: "object";
                    readonly array: false;
                    readonly required: false;
                };
                "kibana.alert.evaluation.values": {
                    readonly type: "scaled_float";
                    readonly scaling_factor: 100;
                    readonly required: false;
                    readonly array: true;
                };
                "kibana.alert.grouping": {
                    readonly type: "object";
                    readonly dynamic: true;
                    readonly array: false;
                    readonly required: false;
                };
                "kibana.alert.group": {
                    readonly type: "object";
                    readonly array: true;
                    readonly required: false;
                };
                "kibana.alert.group.field": {
                    readonly type: "keyword";
                    readonly array: true;
                    readonly required: false;
                };
                "kibana.alert.group.value": {
                    readonly type: "keyword";
                    readonly array: true;
                    readonly required: false;
                };
            };
            dynamicTemplates: {
                strings_as_keywords: {
                    path_match: string;
                    match_mapping_type: string;
                    mapping: {
                        type: "keyword";
                        ignore_above: number;
                    };
                };
            }[];
        };
        useEcs: boolean;
        useLegacyAlerts: boolean;
        shouldWrite: boolean;
    };
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) => string;
};
export declare const reasonActionVariableDescription: string;
export declare const timestampActionVariableDescription: string;
export declare const viewInAppUrlActionVariableDescription: string;
export declare const alertDetailsUrlActionVariableDescription: string;
export declare const sloIdActionVariableDescription: string;
export declare const sloNameActionVariableDescription: string;
export declare const sloInstanceIdActionVariableDescription: string;
export declare const suppressedActionVariableDescription: string;
export declare const sliValueActionVariableDescription: string;
export declare const sloStatusActionVariableDescription: string;
export declare const sloErrorBudgetRemainingActionVariableDescription: string;
export declare const sloErrorBudgetConsumedActionVariableDescription: string;
export declare const groupingObjectActionVariableDescription: string;
