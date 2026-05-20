import type { TypeOf } from '@kbn/config-schema';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { ProfilingDataAccessPluginSetup, ProfilingDataAccessPluginStart } from './plugin';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    elasticsearch: import("@kbn/config-schema").ConditionalType<import("@kbn/config-schema").Type<true>, never, Readonly<{} & {
        username: string;
        hosts: string;
        password: string;
    }> | undefined>;
}>;
export type ProfilingConfig = TypeOf<typeof configSchema>;
export type { ProfilingDataAccessPluginSetup, ProfilingDataAccessPluginStart };
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").ProfilingDataAccessPlugin>;
