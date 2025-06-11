
import { CoreStart } from '@kbn/core/public';

export interface ElasticAssistantSharedStatePublicPluginSetupDependencies {
}
export interface ElasticAssistantSharedStatePublicPluginStartDependencies {
}

export type StartServices = CoreStart &
  ElasticAssistantSharedStatePublicPluginStartDependencies & {
  }
    