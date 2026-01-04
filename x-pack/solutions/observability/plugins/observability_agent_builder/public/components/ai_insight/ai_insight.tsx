/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  EuiIcon,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import {
  EuiMarkdownFormat,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { filter, map, of } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { untilAborted } from '../../utils/until_aborted';
import { StartConversationButton } from './start_conversation_button';
import { AiInsightErrorBanner } from './ai_insight_error_banner';

const ButtonSection = ({
  children,
  align = 'flexStart',
}: {
  children: React.ReactNode;
  align?: 'flexStart' | 'flexEnd';
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiHorizontalRule margin="none" />
    <EuiSpacer size="s" />
    <EuiFlexGroup justifyContent={align} gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  </>
);

export interface AiInsightAttachment {
  type: string;
  data: Record<string, unknown>;
  hidden?: boolean;
}

export interface AiInsightProps {
  title: string;
  fetchInsight: (signal?: AbortSignal) => Promise<Response>;
  buildAttachments: (summary: string, context: string) => AiInsightAttachment[];
}

export function AiInsight({ title, fetchInsight, buildAttachments }: AiInsightProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');
  const [wasStopped, setWasStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    services: { agentBuilder, application },
  } = useKibana();

  const { getLicense } = useLicense();
  const license = getLicense();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
  const hasAgentBuilderAccess = application?.capabilities.agentBuilder?.show === true;

  const handleFetchInsight = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setError(undefined);
    setWasStopped(false);
    setSummary('');
    setContext('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await fetchInsight(abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      let accumulatedContent = '';
      let contextValue = '';

      const observable$ = of({ response: result }).pipe(
        httpResponseIntoObservable(),
        filter(
          (event: { type: string }): boolean =>
            event.type === 'context' ||
            event.type === 'chatCompletionChunk' ||
            event.type === 'chatCompletionMessage'
        ),
        map((event: { type: string; [key: string]: unknown }) => {
          if (event.type === 'context') {
            return { type: 'context' as const, context: (event.context as string) || '' };
          }
          if (event.type === 'chatCompletionChunk') {
            return { type: 'chunk' as const, content: (event.content as string) || '' };
          }
          return { type: 'message' as const, content: (event.content as string) || '' };
        }),
        untilAborted(abortController.signal)
      );

      observable$.subscribe({
        next: (event: { type: string; context?: string; content?: string } | null) => {
          if (event?.type === 'context') {
            contextValue = event.context || '';
            setContext(contextValue);
          } else if (event?.type === 'chunk') {
            accumulatedContent += event.content || '';
            setSummary(accumulatedContent);
          } else if (event?.type === 'message') {
            accumulatedContent = event.content || '';
            setSummary(accumulatedContent);
            setIsLoading(false);
          }
        },
        error: (err: unknown) => {
          if (err instanceof AbortError) {
            setIsLoading(false);
            return;
          }
          setError(err instanceof Error ? err.message : 'Failed to load AI insight');
          setIsLoading(false);
        },
        complete: () => {
          setIsLoading(false);
        },
      });
    } catch (e) {
      if (e instanceof AbortError) {
        setIsLoading(false);
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load AI insight');
      setIsLoading(false);
    }
  }, [fetchInsight]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setWasStopped(true);
    }
  }, []);

  const handleRegenerate = handleFetchInsight;

  const handleStartConversation = useCallback(() => {
    if (!agentBuilder?.openConversationFlyout) return;

    agentBuilder.openConversationFlyout({
      newConversation: true,
      attachments: buildAttachments(summary, context),
    });
  }, [agentBuilder, buildAttachments, summary, context]);

  if (
    !agentBuilder ||
    !isAgentChatExperienceEnabled ||
    !hasAgentBuilderAccess ||
    !hasEnterpriseLicense
  ) {
    return null;
  }

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
      <EuiAccordion
        id="agentBuilderAiInsight"
        arrowProps={{ css: { alignSelf: 'flex-start' } }}
        buttonContent={
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="m"
            alignItems="flexStart"
            data-test-subj="agentBuilderAiInsight"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon
                type="sparkles"
                color={euiTheme.colors.primary}
                style={{ marginTop: 6 }}
                size="l"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
                <h5>{title}</h5>
              </EuiText>
              <EuiText size="s" css={{ color: euiTheme.colors.textSubdued }}>
                <span>
                  {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.description', {
                    defaultMessage: 'Get helpful insights from our Elastic AI Agent',
                  })}
                </span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isLoading={false}
        isDisabled={false}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(open) => {
          setIsOpen(open);
          if (open && !error && !summary && !isLoading) {
            handleFetchInsight();
          }
        }}
      >
        <EuiSpacer size="m" />
        <EuiPanel color="subdued">
          {error ? (
            <AiInsightErrorBanner error={error} onRetry={handleFetchInsight} />
          ) : (
            <EuiText size="s">
              <EuiMarkdownFormat
                textSize="s"
                parsingPluginList={getDefaultEuiMarkdownParsingPlugins()}
                processingPluginList={getDefaultEuiMarkdownProcessingPlugins()}
              >
                {summary}
              </EuiMarkdownFormat>
            </EuiText>
          )}
        </EuiPanel>

        {isLoading ? (
          <ButtonSection>
            <EuiButtonEmpty
              data-test-subj="observabilityAgentBuilderStopGeneratingButton"
              color="text"
              iconType="stop"
              size="s"
              onClick={handleStopGenerating}
            >
              {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.stopGeneratingButton', {
                defaultMessage: 'Stop generating',
              })}
            </EuiButtonEmpty>
          </ButtonSection>
        ) : wasStopped ? (
          <ButtonSection>
            <EuiButtonEmpty
              data-test-subj="observabilityAgentBuilderRegenerateButton"
              size="s"
              iconType="sparkles"
              onClick={handleRegenerate}
            >
              {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.regenerateButton', {
                defaultMessage: 'Regenerate',
              })}
            </EuiButtonEmpty>
          </ButtonSection>
        ) : Boolean(summary && summary.trim()) ? (
          <ButtonSection align="flexEnd">
            <StartConversationButton onClick={handleStartConversation} />
          </ButtonSection>
        ) : null}
      </EuiAccordion>
    </EuiPanel>
  );
}
