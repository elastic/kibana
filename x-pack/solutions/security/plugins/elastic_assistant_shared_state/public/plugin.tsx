import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';

import { ElasticAssistantSharedStatePublicPluginSetupDependencies, ElasticAssistantSharedStatePublicPluginStartDependencies } from './types';
import { CommentsService } from '@kbn/elastic-assistant-shared-state';

export type ElasticAssistantSharedStatePublicPluginSetup = ReturnType<ElasticAssistantSharedStatePublicPlugin['setup']>;
export type ElasticAssistantSharedStatePublicPluginStart = ReturnType<ElasticAssistantSharedStatePublicPlugin['start']>;

export class ElasticAssistantSharedStatePublicPlugin implements Plugin<
  ElasticAssistantSharedStatePublicPluginSetup,
  ElasticAssistantSharedStatePublicPluginStart,
  ElasticAssistantSharedStatePublicPluginSetupDependencies,
  ElasticAssistantSharedStatePublicPluginStartDependencies> {
  private readonly version: string;
  private readonly commentService: CommentsService;


  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
    this.commentService = new CommentsService();
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantSharedStatePublicPluginStartDependencies) {
    const comments = this.commentService.start();

    return {
      comments
    };
  }

  public stop() {
    // Cleanup when plugin is stopped
  }
}
