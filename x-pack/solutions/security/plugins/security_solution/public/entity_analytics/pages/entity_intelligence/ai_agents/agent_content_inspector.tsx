/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { useAgentConversationContent } from './use_agent_conversations';
import { AgentEvidenceButton, AgentOutcome } from './agent_evidence';
import type { AgentContentText } from './agent_conversations';
import type { AgentInvocation, AgentToolCall } from './types';

const ContentBlock: React.FC<{ title: string; content?: AgentContentText; language?: string }> = ({
  title,
  content,
  language,
}) =>
  content ? (
    <>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock language={language} overflowHeight={260} paddingSize="m" fontSize="s">
        {content.text || '—'}
      </EuiCodeBlock>
      {(content.redacted || content.truncated) && (
        <EuiText size="xs" color="subdued">
          {content.redacted &&
            i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.content.redacted',
              { defaultMessage: 'Recognized secret values masked. ' }
            )}
          {content.truncated &&
            i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.content.truncated',
              { defaultMessage: 'Content shortened for display.' }
            )}
        </EuiText>
      )}
      <EuiSpacer size="l" />
    </>
  ) : null;

export interface AgentContentInspectorProps {
  spaceId: string | undefined;
  agentId: string;
  conversationId?: string;
  invocation: AgentInvocation;
  calls: AgentToolCall[];
  selectedCallId?: string;
  onSelectCall: (id?: string) => void;
  onClose: () => void;
}

export const AgentContentInspector: React.FC<AgentContentInspectorProps> = ({
  spaceId,
  agentId,
  conversationId,
  invocation,
  calls,
  selectedCallId,
  onSelectCall,
  onClose,
}) => {
  const call = calls.find((item) => item.id === selectedCallId);
  const content = useAgentConversationContent(spaceId, agentId, conversationId, invocation, call);
  const { http } = useKibana().services;
  const titleId = useGeneratedHtmlId({ prefix: 'agentContent' });
  const detail =
    content.unavailable || content.isLoading || (selectedCallId && !call)
      ? undefined
      : content.detail;
  const title =
    detail?.tool?.id ??
    detail?.title ??
    i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.content.title', {
      defaultMessage: 'Execution content',
    });
  const conversationUrl = detail
    ? http.basePath.prepend(
        `/app/agent_builder/agents/${encodeURIComponent(
          agentId
        )}/conversations/${encodeURIComponent(detail.conversationId)}`
      )
    : undefined;
  return (
    <EuiFlyout
      size="m"
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        min-width: 520px;
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <AgentOutcome outcome={call?.outcome ?? invocation.outcome} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSelect
          fullWidth
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agents.content.select',
            { defaultMessage: 'Select execution content' }
          )}
          value={call?.id ?? 'round'}
          onChange={(event) =>
            onSelectCall(event.target.value === 'round' ? undefined : event.target.value)
          }
          options={[
            {
              value: 'round',
              text: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.content.conversationOption',
                { defaultMessage: 'Conversation prompt and response' }
              ),
            },
            ...calls.map((item, index) => ({
              value: item.id,
              text: `${index + 1}. ${item.nameRedacted ? 'Custom tool' : item.toolName} · ${
                item.timestamp
              }`,
            })),
          ]}
        />
        <EuiSpacer size="l" />
        {content.isLoading ? (
          <EuiSkeletonText lines={7} />
        ) : content.unavailable || !detail ? (
          <KbnWarningCallout
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.content.unavailable',
              { defaultMessage: 'Conversation content unavailable' }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.content.unavailableDescription',
                {
                  defaultMessage:
                    'The current user must have access to the conversation, and its recorded reference must match this invocation. No content is inferred from tool names or timestamps.',
                }
              )}
            </p>
          </KbnWarningCallout>
        ) : (
          <>
            {detail.status !== 'matched' && (
              <>
                <KbnInfoCallout
                  size="s"
                  title={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.content.noExactMatch',
                    { defaultMessage: 'No unique recorded content match' }
                  )}
                >
                  <p>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.content.noExactMatchDescription',
                      {
                        defaultMessage:
                          'A unique round trace ID and tool-call ID are required to show execution inputs. The conversation can still be opened at its source.',
                      }
                    )}
                  </p>
                </KbnInfoCallout>
                <EuiSpacer size="m" />
              </>
            )}
            {detail.tool && (
              <>
                <ContentBlock
                  title={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.content.arguments',
                    { defaultMessage: 'Tool arguments' }
                  )}
                  content={detail.tool.arguments}
                  language="json"
                />
                <ContentBlock
                  title={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.content.results',
                    { defaultMessage: 'Tool result' }
                  )}
                  content={detail.tool.results}
                  language="json"
                />
              </>
            )}
            <ContentBlock
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.content.prompt',
                { defaultMessage: 'Recorded prompt' }
              )}
              content={detail.prompt}
            />
            {!call && (
              <ContentBlock
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.content.response',
                  { defaultMessage: 'Agent response' }
                )}
                content={detail.response}
              />
            )}
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.content.sourceBadge',
                { defaultMessage: 'Source: Agent Builder conversation API' }
              )}
            </EuiBadge>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              compressed
              listItems={[
                {
                  title: i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.content.conversationId',
                    { defaultMessage: 'Conversation ID' }
                  ),
                  description: detail.conversationId,
                },
                {
                  title: i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.content.roundId',
                    { defaultMessage: 'Round ID' }
                  ),
                  description: detail.roundId ?? '—',
                },
                {
                  title: i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.content.callId',
                    { defaultMessage: 'Tool-call ID' }
                  ),
                  description: detail.tool?.callId ?? call?.toolCallId ?? '—',
                },
              ]}
            />
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {conversationUrl && (
          <EuiButtonEmpty href={conversationUrl} target="_blank" iconType="external">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.content.openConversation',
              { defaultMessage: 'Open conversation' }
            )}
          </EuiButtonEmpty>
        )}
        <AgentEvidenceButton event={call ?? invocation} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
