import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';

import { ElasticAssistantSharedStatePublicPluginSetupDependencies, ElasticAssistantSharedStatePublicPluginStartDependencies } from './types';
import { CommentsService, AssistantAvailabilityService, PromptContextService } from '@kbn/elastic-assistant-shared-state';

export type ElasticAssistantSharedStatePublicPluginSetup = ReturnType<ElasticAssistantSharedStatePublicPlugin['setup']>;
export type ElasticAssistantSharedStatePublicPluginStart = ReturnType<ElasticAssistantSharedStatePublicPlugin['start']>;

export class ElasticAssistantSharedStatePublicPlugin implements Plugin<
  ElasticAssistantSharedStatePublicPluginSetup,
  ElasticAssistantSharedStatePublicPluginStart,
  ElasticAssistantSharedStatePublicPluginSetupDependencies,
  ElasticAssistantSharedStatePublicPluginStartDependencies> {
  private readonly version: string;
  private readonly commentService: CommentsService;
  private readonly assistantAvailabilityService: AssistantAvailabilityService;
  private readonly promptContextService: PromptContextService


  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
    this.commentService = new CommentsService();
    this.assistantAvailabilityService = new AssistantAvailabilityService();
    this.promptContextService = new PromptContextService();
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantSharedStatePublicPluginStartDependencies) {
    const comments = this.commentService.start();
    const assistantAvailability = this.assistantAvailabilityService.start();
    const promptContexts = this.promptContextService.start();

    return {
      comments,
      assistantAvailability,
      promptContexts,
    };
  }

  public stop() {
    // Cleanup when plugin is stopped
  }
}
