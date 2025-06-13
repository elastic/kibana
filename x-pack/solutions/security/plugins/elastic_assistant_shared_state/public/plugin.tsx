import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';

import { ElasticAssistantSharedStatePublicPluginSetupDependencies, ElasticAssistantSharedStatePublicPluginStartDependencies } from './types';
import { CommentsService, PromptContextService, AssistantContextValueService } from '@kbn/elastic-assistant-shared-state';

export type ElasticAssistantSharedStatePublicPluginSetup = ReturnType<ElasticAssistantSharedStatePublicPlugin['setup']>;
export type ElasticAssistantSharedStatePublicPluginStart = ReturnType<ElasticAssistantSharedStatePublicPlugin['start']>;

export class ElasticAssistantSharedStatePublicPlugin implements Plugin<
  ElasticAssistantSharedStatePublicPluginSetup,
  ElasticAssistantSharedStatePublicPluginStart,
  ElasticAssistantSharedStatePublicPluginSetupDependencies,
  ElasticAssistantSharedStatePublicPluginStartDependencies> {
  private readonly commentService: CommentsService;
  private readonly promptContextService: PromptContextService
  private readonly assistantContextValueService: AssistantContextValueService


  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.commentService = new CommentsService();
    this.promptContextService = new PromptContextService();
    this.assistantContextValueService = new AssistantContextValueService();
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantSharedStatePublicPluginStartDependencies) {
    const comments = this.commentService.start();
    const promptContexts = this.promptContextService.start();
    const assistantContextValue = this.assistantContextValueService.start();

    return {
      comments,
      promptContexts,
      assistantContextValue
    };
  }

  public stop() {
    // Cleanup when plugin is stopped
  }
}
