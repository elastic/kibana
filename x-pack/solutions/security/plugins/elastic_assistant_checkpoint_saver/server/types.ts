import { CoreSetup } from "@kbn/core/server";
import { ElasticSearchSaver } from "@kbn/langgraph-checkpoint-saver/server/elastic-search-checkpoint-saver";

export interface ElasticAssistantCheckpointSaverPluginSetup {
}

export interface ElasticAssistantCheckpointSaverPluginStart {
  getCheckpointSaver: () => Promise<ElasticSearchSaver>;
}

export interface ElasticAssistantCheckpointSaverPluginSetupDependencies {
}

export interface ElasticAssistantCheckpointSaverPluginStartDependencies {
}

export type ElasticAssistantCheckpointSaverPluginCoreSetupDependencies = CoreSetup<
  ElasticAssistantCheckpointSaverPluginStartDependencies,
  ElasticAssistantCheckpointSaverPluginStart
>;