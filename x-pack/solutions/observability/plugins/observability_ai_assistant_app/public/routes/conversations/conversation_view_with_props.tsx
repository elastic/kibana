/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationView, FlyoutPositionMode } from '@kbn/ai-assistant';
import { ObservabilityAIAssistantFlyoutStateProvider } from '@kbn/observability-ai-assistant-plugin/public';
import { useObservabilityAIAssistantParams } from '../../hooks/use_observability_ai_assistant_params';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { useLocalStorage } from '../../hooks/use_local_storage';

export function ConversationViewWithProps() {
  const { path } = useObservabilityAIAssistantParams('/conversations/*');
  const conversationId = 'conversationId' in path ? path.conversationId : undefined;
  const observabilityAIAssistantRouter = useObservabilityAIAssistantRouter();

  const [flyoutSettings] = useLocalStorage('observabilityAIAssistant.flyoutSettings', {
    mode: FlyoutPositionMode.OVERLAY,
    isOpen: false,
  });

  function navigateToConversation(nextConversationId?: string) {
    if (nextConversationId) {
      observabilityAIAssistantRouter.push('/conversations/{conversationId}', {
        path: {
          conversationId: nextConversationId,
        },
        query: {},
      });
    } else {
      observabilityAIAssistantRouter.push('/conversations/new', { path: {}, query: {} });
    }
  }

  return (
    <ObservabilityAIAssistantFlyoutStateProvider isFlyoutOpen={flyoutSettings.isOpen}>
      <ConversationView
        conversationId={conversationId}
        navigateToConversation={navigateToConversation}
        newConversationHref={observabilityAIAssistantRouter.link('/conversations/new')}
        getConversationHref={(id: string) =>
          observabilityAIAssistantRouter.link(`/conversations/{conversationId}`, {
            path: {
              conversationId: id,
            },
          })
        }
        scopes={['observability']}
      />
    </ObservabilityAIAssistantFlyoutStateProvider>
  );
}
