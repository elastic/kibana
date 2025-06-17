import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';

import { ElasticAssistantSharedStatePublicPluginSetupDependencies, ElasticAssistantSharedStatePublicPluginStartDependencies } from './types';
import { CommentsService, PromptContextService, AssistantContextValueService, AugmentMessageCodeBlocksService, SignalIndexService } from '@kbn/elastic-assistant-shared-state';

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
  private readonly augmentMessageCodeBlocksService: AugmentMessageCodeBlocksService
  private readonly signalIndexService: SignalIndexService


  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.commentService = new CommentsService();
    this.promptContextService = new PromptContextService();
    this.assistantContextValueService = new AssistantContextValueService();
    this.augmentMessageCodeBlocksService = new AugmentMessageCodeBlocksService();
    this.signalIndexService = new SignalIndexService();
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantSharedStatePublicPluginStartDependencies) {
    const comments = this.commentService.start();
    const promptContexts = this.promptContextService.start();
    const assistantContextValue = this.assistantContextValueService.start();
    const augmentMessageCodeBlocks = this.augmentMessageCodeBlocksService.start();
    const signalIndex = this.signalIndexService.start();

    return {
      comments,
      promptContexts,
      assistantContextValue,
      augmentMessageCodeBlocks,
      signalIndex
    };
  }

  public stop() {
    // Cleanup when plugin is stopped
  }
}
