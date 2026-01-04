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
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useStreamingAiInsight } from '../../hooks/use_streaming_ai_insight';
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

  const {
    services: { agentBuilder, application },
  } = useKibana();

  const { getLicense } = useLicense();
  const license = getLicense();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
  const hasAgentBuilderAccess = application?.capabilities.agentBuilder?.show === true;

  const { isLoading, error, summary, context, wasStopped, fetch, stop, regenerate } =
    useStreamingAiInsight(fetchInsight);

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
              onClick={stop}
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
              onClick={regenerate}
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
