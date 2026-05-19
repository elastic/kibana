import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
declare const uptimeConfig: import("@kbn/config-schema").ObjectType<{
    index: import("@kbn/config-schema").Type<string | undefined>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    experimental: import("@kbn/config-schema").Type<Readonly<{
        ruleFormV2Enabled?: boolean | undefined;
    } & {}> | undefined>;
}>;
export declare const config: PluginConfigDescriptor;
export type UptimeConfig = TypeOf<typeof uptimeConfig>;
export type ExperimentalFeatures = UptimeConfig['experimental'];
export {};
