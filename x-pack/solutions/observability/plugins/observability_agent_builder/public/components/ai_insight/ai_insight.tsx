/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
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
  EuiMarkdownFormat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { Observable } from 'rxjs';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import {
  useStreamingAiInsight,
  type InsightStreamEvent,
} from '../../hooks/use_streaming_ai_insight';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { StartConversationButton } from './start_conversation_button';
import { AiInsightErrorBanner } from './ai_insight_error_banner';
import { LoadingCursor } from './loading_cursor';
import { OBSERVABILITY_AGENT_ID } from '../../../common/constants';

export interface AiInsightResponse {
  summary: string;
  context: string;
}

export interface AiInsightAttachment {
  type: string;
  data: Record<string, unknown>;
  hidden?: boolean;
}

export interface AiInsightProps {
  title: string;
  createStream: (signal: AbortSignal) => Observable<InsightStreamEvent>;
  buildAttachments: (summary: string, context: string) => AiInsightAttachment[];
}

export function AiInsight({ title, createStream, buildAttachments }: AiInsightProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const {
    services: { agentBuilder, application },
  } = useKibana();

  const { getLicense } = useLicense();
  const license = getLicense();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const { hasConnectors } = useGenAIConnectors();

  const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
  const hasAgentBuilderAccess = application?.capabilities.agentBuilder?.show === true;

  const { isLoading, error, summary, context, wasStopped, fetch, stop, regenerate } =
    useStreamingAiInsight(createStream);

  const handleStartConversation = useCallback(() => {
    if (!agentBuilder?.openConversationFlyout) return;

    agentBuilder.openConversationFlyout({
      newConversation: true,
      agentId: OBSERVABILITY_AGENT_ID,
      attachments: buildAttachments(summary, context),
    });
  }, [agentBuilder, buildAttachments, summary, context]);

  if (
    !hasConnectors ||
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
                    defaultMessage: 'Get helpful insights from our Observability Agent',
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
            fetch();
          }
        }}
      >
        <EuiSpacer size="m" />
        <EuiPanel color="subdued">
          {error ? (
            <AiInsightErrorBanner error={error} onRetry={fetch} />
          ) : (
            <EuiText size="s">
              <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>
              {isLoading && <LoadingCursor />}
            </EuiText>
          )}

          {isLoading ? (
            <>
              <EuiSpacer size="m" />
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="flexStart" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="observabilityAgentBuilderStopGeneratingButton"
                    color="text"
                    iconType="stop"
                    size="s"
                    onClick={stop}
                  >
                    {i18n.translate(
                      'xpack.observabilityAgentBuilder.aiInsight.stopGeneratingButton',
                      {
                        defaultMessage: 'Stop generating',
                      }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : wasStopped ? (
            <>
              <EuiSpacer size="m" />
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="observabilityAgentBuilderRegenerateButton"
                    size="s"
                    iconType="sparkles"
                    onClick={regenerate}
                  >
                    {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.regenerateButton', {
                      defaultMessage: 'Regenerate',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {Boolean(summary && summary.trim()) && (
                  <EuiFlexItem grow={false}>
                    <StartConversationButton onClick={handleStartConversation} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </>
          ) : Boolean(summary && summary.trim()) ? (
            <>
              <EuiSpacer size="m" />
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <StartConversationButton onClick={handleStartConversation} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
        </EuiPanel>
      </EuiAccordion>
    </EuiPanel>
  );
}
