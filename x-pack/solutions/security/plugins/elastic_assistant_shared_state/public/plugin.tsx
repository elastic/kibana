/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from '@kbn/core/public';

import {
  CommentsService,
  PromptContextService,
  AssistantContextValueService,
  AugmentMessageCodeBlocksService,
  SignalIndexService,
} from '@kbn/elastic-assistant-shared-state';
import {
  ElasticAssistantSharedStatePublicPluginSetupDependencies,
  ElasticAssistantSharedStatePublicPluginStartDependencies,
} from './types';

export type ElasticAssistantSharedStatePublicPluginSetup = ReturnType<
  ElasticAssistantSharedStatePublicPlugin['setup']
>;
export type ElasticAssistantSharedStatePublicPluginStart = ReturnType<
  ElasticAssistantSharedStatePublicPlugin['start']
>;

export class ElasticAssistantSharedStatePublicPlugin
  implements
    Plugin<
      ElasticAssistantSharedStatePublicPluginSetup,
      ElasticAssistantSharedStatePublicPluginStart,
      ElasticAssistantSharedStatePublicPluginSetupDependencies,
      ElasticAssistantSharedStatePublicPluginStartDependencies
    >
{
  private readonly commentService: CommentsService;
  private readonly promptContextService: PromptContextService;
  private readonly assistantContextValueService: AssistantContextValueService;
  private readonly augmentMessageCodeBlocksService: AugmentMessageCodeBlocksService;
  private readonly signalIndexService: SignalIndexService;

  constructor() {
    this.commentService = new CommentsService();
    this.promptContextService = new PromptContextService();
    this.assistantContextValueService = new AssistantContextValueService();
    this.augmentMessageCodeBlocksService = new AugmentMessageCodeBlocksService();
    this.signalIndexService = new SignalIndexService();
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start() {
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
      signalIndex,
    };
  }

  public stop() {
    this.commentService.stop();
    this.promptContextService.stop();
    this.assistantContextValueService.stop();
    this.augmentMessageCodeBlocksService.stop();
    this.signalIndexService.stop();
  }
}
