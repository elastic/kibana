import type { PluginInitializer } from '@kbn/core/public';
import type { MetricsDataPluginSetup, MetricsDataPluginStart, RouteState } from './types';
import { useAssetDetailsRedirect } from './pages/link_to';
export declare const plugin: PluginInitializer<MetricsDataPluginSetup, MetricsDataPluginStart>;
export type { MetricsDataPluginSetup, MetricsDataPluginStart };
export type { RouteState };
export { useAssetDetailsRedirect };
