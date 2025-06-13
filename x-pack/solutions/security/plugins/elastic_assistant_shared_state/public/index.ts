import { PluginInitializerContext } from '@kbn/core/public';
import { ElasticAssistantSharedStatePublicPlugin } from './plugin';

export type { ElasticAssistantSharedStatePublicPluginStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new ElasticAssistantSharedStatePublicPlugin(initializerContext);