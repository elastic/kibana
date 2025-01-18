/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/public';
import { Subject } from 'rxjs';

export function useObservabilityAIAssistantChatService() {
  return {
    chat: () => new Subject(),
    complete: () => new Subject(),
    getFunctions: () => {
      return [
        {
          id: 'foo',
          name: 'foo',
          description: 'use this function to foo',
          descriptionForUser: 'a function that functions',
          visibility: FunctionVisibility.All,
        },
      ];
    },
    getSystemMessage: () => {},
    hasFunction: () => true,
    hasRenderFunction: () => true,
    sendAnalyticsEvent: () => {},
  };
}
