/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export async function deleteConversations(getService: FtrProviderContext['getService']) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const response = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/conversations',
  });

  for (const conversation of response.body.conversations) {
    await observabilityAIAssistantAPIClient.editor({
      endpoint: `DELETE /internal/observability_ai_assistant/conversation/{conversationId}`,
      params: {
        path: {
          conversationId: conversation.conversation.id,
        },
      },
    });
  }
}
