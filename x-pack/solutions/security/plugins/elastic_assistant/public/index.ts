import { PluginInitializerContext } from '@kbn/core/public';
import { ElasticAssistantPublicPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new ElasticAssistantPublicPlugin(initializerContext);
