/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CommentsService,
  PromptContextService,
  AssistantContextValueService,
  AugmentMessageCodeBlocksService,
  SignalIndexService,
} from '@kbn/elastic-assistant-shared-state';

export const createStartContract = () => {
  const commentService = new CommentsService();
  const promptContextService = new PromptContextService();
  const assistantContextValueService = new AssistantContextValueService();
  const augmentMessageCodeBlocksService = new AugmentMessageCodeBlocksService();
  const signalIndexService = new SignalIndexService();

  return {
    comments: commentService.start(),
    promptContexts: promptContextService.start(),
    assistantContextValue: assistantContextValueService.start(),
    augmentMessageCodeBlocks: augmentMessageCodeBlocksService.start(),
    signalIndex: signalIndexService.start(),
  };
};
