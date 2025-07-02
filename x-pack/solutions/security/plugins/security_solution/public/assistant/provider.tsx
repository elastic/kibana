/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import { AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';

import { isEmpty } from 'lodash/fp';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../common/lib/kibana';
import { useAssistantAvailability } from './use_assistant_availability';
import { licenseService } from '../common/hooks/use_license';
import { useFindPromptContexts } from './content/prompt_contexts/use_find_prompt_contexts';
import { CommentActionsPortal } from './comment_actions/comment_actions_portal';
import { AugmentMessageCodeBlocksPortal } from './use_augment_message_code_blocks/augment_message_code_blocks_portal';
import { useElasticAssistantSharedStateSignalIndex } from './use_elastic_assistant_shared_state_signal_index/use_elastic_assistant_shared_state_signal_index';
import { useMigrateConversationsFromLocalStorage } from './migrate_conversations_from_local_storage/use_migrate_conversation_from_local_storage';

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export const AssistantProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { http, notifications, elasticAssistantSharedState } = useKibana().services;

  const assistantContextValue = useObservable(
    elasticAssistantSharedState.assistantContextValue.getAssistantContextValue$()
  );

  const assistantAvailability = useAssistantAvailability();
  const hasEnterpriseLicence = licenseService.isEnterprise();
  useMigrateConversationsFromLocalStorage();
  useElasticAssistantSharedStateSignalIndex();

  const promptContexts = useFindPromptContexts({
    context: {
      isAssistantEnabled:
        hasEnterpriseLicence &&
        assistantAvailability.isAssistantEnabled &&
        assistantAvailability.hasAssistantPrivilege,
      httpFetch: http.fetch,
      toasts: notifications.toasts,
    },
    params: {
      prompt_group_id: 'aiAssistant',
      prompt_ids: ['alertEvaluation', 'dataQualityAnalysis', 'ruleAnalysis'],
    },
  });
  const promptContext = useObservable(
    elasticAssistantSharedState.promptContexts.getPromptContext$(),
    {}
  );
  useEffect(() => {
    if (isEmpty(promptContext)) {
      elasticAssistantSharedState.promptContexts.setPromptContext(promptContexts);
    }
  }, [elasticAssistantSharedState.promptContexts, promptContext, promptContexts]);

  if (!assistantContextValue) {
    return null;
  }

  return (
    <ElasticAssistantProvider value={assistantContextValue}>
      <CommentActionsPortal />
      <AugmentMessageCodeBlocksPortal />
      {children}
    </ElasticAssistantProvider>
  );
};
