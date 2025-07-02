/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ClientMessage,
  AssistantProvider as ElasticAssistantProvider,
} from '@kbn/elastic-assistant';
import type { IToasts } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { useAssistantContextValue } from '@kbn/elastic-assistant/impl/assistant_context';
import { getComments } from '../../components/get_comments';
import { useKibana } from '../typed_kibana_context/typed_kibana_context';
import { useInferenceEnabled } from '../../hooks/inference_enabled/use_inference_enabled';
import { useAppToasts } from '../../hooks/toasts/use_app_toasts';
import { useAssistantAvailability } from '../../hooks/assistant_availability/use_assistant_availability';
import { useBasePath } from '../../hooks/base_path/use_base_path';
import { CommentActionsMounter } from '../../components/comment_actions/comment_actions_mounter';
import { useAssistantTelemetry } from '../../hooks/use_assistant_telemetry';
import { useIsNavControlVisible } from '../../hooks/is_nav_control_visible/use_is_nav_control_visible';

const ASSISTANT_TITLE = i18n.translate('xpack.elasticAssistantPlugin.assistant.title', {
  defaultMessage: 'Elastic AI Assistant',
});

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export function AssistantProvider({ children }: { children: React.ReactElement }) {
  const {
    application: { navigateToApp, currentAppId$, getUrlForApp },
    http,
    triggersActionsUi: { actionTypeRegistry },
    docLinks,
    userProfile,
    chrome,
    productDocBase,
    elasticAssistantSharedState,
  } = useKibana().services;

  const inferenceEnabled = useInferenceEnabled();

  const basePath = useBasePath();
  const assistantAvailability = useAssistantAvailability();

  const assistantTelemetry = useAssistantTelemetry();
  const currentAppId = useObservable(currentAppId$, '');
  const promptContext = useObservable(
    elasticAssistantSharedState.promptContexts.getPromptContext$(),
    {}
  );
  const alertsIndexPattern = useObservable(
    elasticAssistantSharedState.signalIndex.getSignalIndex$(),
    undefined
  );
  const augmentMessageCodeBlocks = useObservable(
    elasticAssistantSharedState.augmentMessageCodeBlocks.getAugmentMessageCodeBlocks$(),
    {
      mount: () => () => {},
    }
  );

  const toasts = useAppToasts() as unknown as IToasts; // useAppToasts is the current, non-deprecated method of getting the toasts service in the Security Solution, but it doesn't return the IToasts interface (defined by core)

  const memoizedCommentActionsMounter = useCallback(
    (args: { message: ClientMessage }) => {
      return (
        <CommentActionsMounter
          message={args.message}
          getActions$={elasticAssistantSharedState.comments.getActions$()}
        />
      );
    },
    [elasticAssistantSharedState.comments]
  );

  const memoizedGetComments = useMemo(() => {
    return getComments({
      CommentActions: memoizedCommentActionsMounter,
    });
  }, [memoizedCommentActionsMounter]);

  const assistantContextValue = useAssistantContextValue({
    actionTypeRegistry,
    alertsIndexPattern,
    augmentMessageCodeBlocks,
    assistantAvailability,
    assistantTelemetry,
    docLinks,
    basePath,
    basePromptContexts: Object.values(promptContext),
    getComments: memoizedGetComments,
    http,
    inferenceEnabled,
    navigateToApp,
    productDocBase,
    title: ASSISTANT_TITLE,
    toasts,
    currentAppId: currentAppId ?? 'securitySolutionUI',
    userProfileService: userProfile,
    chrome,
    getUrlForApp,
  });

  useEffect(() => {
    elasticAssistantSharedState.assistantContextValue.setAssistantContextValue(
      assistantContextValue
    );
  }, [assistantContextValue, elasticAssistantSharedState.assistantContextValue]);

  const { isVisible } = useIsNavControlVisible();

  if (!isVisible) {
    return null;
  }

  return (
    <ElasticAssistantProvider value={assistantContextValue}>{children}</ElasticAssistantProvider>
  );
}
