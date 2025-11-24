/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useAppUrl } from '../../common/lib/kibana/hooks';

export interface UseAgentBuilderAttachmentParams {
  /**
   * Type of attachment (e.g., 'alert', 'attack_discovery')
   */
  attachmentType: string;
  /**
   * Data for the attachment
   */
  attachmentData: Record<string, unknown>;
  /**
   * Prompt/input text for the agent builder conversation
   */
  attachmentPrompt: string;
}

export interface UseAgentBuilderAttachmentResult {
  /**
   * Function to open the agent builder flyout
   * TODO: This currently calls the API directly as a temporary implementation.
   * Once the agent builder UI is ready, this will open a flyout with the attachment data instead.
   */
  openAgentBuilderFlyout: () => void;
  /**
   * Whether the API call is in progress
   */
  isLoading: boolean;
}

/**
 * Hook to handle agent builder attachment functionality.
 * Temporarily calls the API directly until the agent builder UI is ready.
 * Eventually, this will open a flyout with the attachment data.
 *
 * Improvements over previous implementation:
 * - Uses useIsMounted to prevent state updates after component unmounts
 * - Implements abort controller for request cancellation
 * - Prevents race conditions by cancelling previous requests when a new one starts
 * - Proper cleanup on unmount
 */
export const useAgentBuilderAttachment = ({
  attachmentType,
  attachmentData,
  attachmentPrompt,
}: UseAgentBuilderAttachmentParams): UseAgentBuilderAttachmentResult => {
  const { http, application, i18n: i18nService, theme, userProfile } = useKibana().services;
  const toasts = useAppToasts();
  const { getAppUrl } = useAppUrl();
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useIsMounted();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const openAgentBuilderFlyout = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Only update loading state if component is still mounted
    if (!isMounted()) {
      return;
    }
    setIsLoading(true);

    try {
      // TODO: This API call is temporary until the agent builder UI is ready.
      // Once the UI is ready, this will open a flyout with the attachment data instead.
      const result = await http.post('/api/agent_builder/converse', {
        body: JSON.stringify({
          input: attachmentPrompt,
          attachments: [
            {
              type: attachmentType,
              data: attachmentData,
            },
          ],
        }),
        version: '2023-10-31',
        signal: abortController.signal,
      });

      // Check if request was aborted or component unmounted
      if (abortController.signal.aborted || !isMounted()) {
        return;
      }

      const conversationId = result?.conversation_id;
      const conversationUrl = conversationId
        ? getAppUrl({
            appId: 'agent_builder',
            path: `/conversations/${conversationId}`,
          })
        : null;

      const onViewConversationClick = () => {
        if (conversationUrl) {
          application.navigateToUrl(conversationUrl);
        }
      };

      const renderContent = i18n.translate(
        'xpack.securitySolution.agentBuilder.attachment.successText',
        {
          defaultMessage: 'Your attachment has been sent to the agent builder.',
        }
      );

      toasts.addSuccess({
        color: 'success',
        iconType: 'check',
        title: i18n.translate('xpack.securitySolution.agentBuilder.attachment.successTitle', {
          defaultMessage: 'Agent builder conversation started',
        }),
        text: conversationUrl
          ? toMountPoint(
              <AgentBuilderToastSuccessContent
                content={renderContent}
                onViewConversationClick={onViewConversationClick}
              />,
              { i18n: i18nService, theme, userProfile }
            )
          : renderContent,
      });
    } catch (error) {
      // Don't show error toast if request was aborted or component unmounted
      if (abortController.signal.aborted || !isMounted()) {
        return;
      }

      toasts.addError(error, {
        title: i18n.translate('xpack.securitySolution.agentBuilder.attachment.errorTitle', {
          defaultMessage: 'Failed to start agent builder conversation',
        }),
        toastMessage: i18n.translate('xpack.securitySolution.agentBuilder.attachment.errorText', {
          defaultMessage: 'There was an error sending your attachment to the agent builder.',
        }),
      });
    } finally {
      // Only update loading state if this request wasn't aborted and component is still mounted
      if (!abortController.signal.aborted && isMounted()) {
        setIsLoading(false);
      }

      // Clear the abort controller ref if this was the current request
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    attachmentType,
    attachmentData,
    attachmentPrompt,
    http,
    toasts,
    getAppUrl,
    application,
    i18nService,
    theme,
    userProfile,
    isMounted,
  ]);

  return {
    openAgentBuilderFlyout,
    isLoading,
  };
};

const AgentBuilderToastSuccessContent: React.FC<{
  onViewConversationClick?: () => void;
  content?: string;
}> = ({ onViewConversationClick, content }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {content !== undefined ? (
        <EuiText
          size="s"
          css={css`
            ${logicalCSS('margin-bottom', euiTheme.size.s)};
          `}
          data-test-subj="toaster-content-sync-text"
        >
          {content}
        </EuiText>
      ) : null}
      {onViewConversationClick !== undefined ? (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={onViewConversationClick}
              data-test-subj="toaster-content-conversation-view-link"
            >
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.attachment.viewConversationButton',
                {
                  defaultMessage: 'View conversation',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
};
