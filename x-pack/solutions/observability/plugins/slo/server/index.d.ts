import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { SLOConfig } from '../common/config';
export declare function plugin(ctx: PluginInitializerContext<SLOConfig>): Promise<import("./plugin").SLOPlugin>;
export type { SloClient } from './client';
export type { SLOServerSetup, SLOServerStart } from './types';
export declare const config: PluginConfigDescriptor<SLOConfig>;
