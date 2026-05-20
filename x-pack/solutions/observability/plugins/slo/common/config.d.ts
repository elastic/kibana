import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    sloOrphanSummaryCleanUpTaskEnabled: import("@kbn/config-schema").Type<boolean>;
    tempSummaryCleanupTaskEnabled: import("@kbn/config-schema").Type<boolean>;
    healthScanTaskEnabled: import("@kbn/config-schema").Type<boolean>;
    staleInstancesCleanupTaskEnabled: import("@kbn/config-schema").Type<boolean>;
    compositeSloSummaryTaskEnabled: import("@kbn/config-schema").Type<boolean>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    experimental: import("@kbn/config-schema").Type<Readonly<{} & {
        ruleFormV2: Readonly<{} & {
            enabled: boolean;
        }>;
        compositeSlo: Readonly<{} & {
            enabled: boolean;
        }>;
    }> | undefined>;
}>;
export declare const config: {
    schema: import("@kbn/config-schema").ObjectType<{
        sloOrphanSummaryCleanUpTaskEnabled: import("@kbn/config-schema").Type<boolean>;
        tempSummaryCleanupTaskEnabled: import("@kbn/config-schema").Type<boolean>;
        healthScanTaskEnabled: import("@kbn/config-schema").Type<boolean>;
        staleInstancesCleanupTaskEnabled: import("@kbn/config-schema").Type<boolean>;
        compositeSloSummaryTaskEnabled: import("@kbn/config-schema").Type<boolean>;
        enabled: import("@kbn/config-schema").Type<boolean>;
        experimental: import("@kbn/config-schema").Type<Readonly<{} & {
            ruleFormV2: Readonly<{} & {
                enabled: boolean;
            }>;
            compositeSlo: Readonly<{} & {
                enabled: boolean;
            }>;
        }> | undefined>;
    }>;
    exposeToBrowser: {
        experimental: boolean;
    };
};
export type SLOConfig = TypeOf<typeof configSchema>;
export type ExperimentalFeatures = SLOConfig['experimental'];
