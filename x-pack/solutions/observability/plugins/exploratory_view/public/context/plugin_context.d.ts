import type { AppMountParameters } from '@kbn/core/public';
export interface PluginContextValue {
    appMountParameters: AppMountParameters;
}
export declare const PluginContext: import("react").Context<PluginContextValue>;
