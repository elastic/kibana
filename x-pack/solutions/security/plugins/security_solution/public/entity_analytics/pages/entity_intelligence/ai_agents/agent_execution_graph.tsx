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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SecurityGraphNodes, SecurityGraphSummary } from './security_graph_nodes';
import {
  readableSecurityFindings,
  securityGraphHeight,
  findingMatchesAgentToolCall,
  buildSecurityGraphNodes,
} from './security_graph_model';
import type { SecurityFindingScope, SecurityFindingsResult } from '../security_findings/types';
import { ProviderIcon } from './provider_icon';
import { AgentActorCard } from './agent_actor_card';
import type { AgentResolvedActor } from './agent_actor_identity';
import { AgentOutcome, AgentTimestamp } from './agent_evidence';
import { buildAgentExecutionGraph } from './agent_execution_graph_model';
import type { AgentInventoryItem, AgentInvocation, AgentToolCall } from './types';

export interface AgentExecutionGraphProps {
  agent: AgentInventoryItem;
  invocation: AgentInvocation;
  toolCalls: AgentToolCall[];
  security?: { scope: SecurityFindingScope; result: SecurityFindingsResult; spaceId?: string };
  conversationTitle?: string;
  resolvedActor?: AgentResolvedActor;
  isActorLoading?: boolean;
  onSelectInvocation: () => void;
  onSelectTool: (call: AgentToolCall) => void;
}

export const AgentExecutionGraph: React.FC<AgentExecutionGraphProps> = ({
  agent,
  invocation,
  toolCalls,
  security,
  conversationTitle,
  resolvedActor,
  isActorLoading,
  onSelectInvocation,
  onSelectTool,
}) => {
  const { euiTheme } = useEuiTheme();
  const baseGraph = buildAgentExecutionGraph(invocation, toolCalls);
  const actor = invocation.attribution?.initiatingActor ?? invocation.attribution?.caller;
  const actorLabel = actor?.name ?? actor?.id ?? actor?.hash;
  const contextKey = JSON.stringify([
    security?.spaceId,
    agent.id,
    invocation.traceId,
    invocation.id,
  ]);
  const findings = readableSecurityFindings(security?.result);
  const securityCount = findings.length;
  const securityNodes = buildSecurityGraphNodes(findings, { agentCalls: toolCalls });
  const securityColor = securityNodes.some(
    ({ finding }) => finding.kind === 'policy_violation' && finding.outcome !== 'blocked'
  )
    ? 'danger'
    : securityNodes.every(({ finding }) => finding.outcome === 'blocked')
    ? 'primary'
    : 'warning';
  const hasNativeFindings = findings.some((finding) => finding.invocation);
  const securityHeight = securityGraphHeight(securityNodes.length, hasNativeFindings);
  const graph = {
    ...baseGraph,
    tools: baseGraph.tools.map((tool) => ({ ...tool, y: tool.y + securityHeight })),
    width: Math.max(baseGraph.width, securityCount > 0 ? 1020 : 0),
    height: baseGraph.height + securityHeight,
  };
  const securityLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.securityCount',
    {
      defaultMessage:
        '{count, plural, one {# security finding loaded for this trace} other {# security findings loaded for this trace}}',
      values: { count: securityCount },
    }
  );
  const card = css`
    position: absolute;
    border: ${euiTheme.border.thin};
    border-radius: 12px;
    padding: 12px;
    background: ${euiTheme.colors.emptyShade};
    box-shadow: 0 3px 10px ${transparentize(euiTheme.colors.fullShade, 0.04)};
    color: ${euiTheme.colors.textParagraph};
    text-align: left;
  `;
  const interactive = css`
    cursor: pointer;
    &:hover {
      border-color: ${euiTheme.colors.primary};
    }
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 3px;
    }
  `;
  const clipped = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  return (
    <section
      data-test-subj="agentExecutionGraph"
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.label',
        { defaultMessage: 'Agent Builder execution graph' }
      )}
    >
      {security && (
        <div
          css={css`
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          <SecurityGraphSummary result={security.result} agentCalls={toolCalls} />
        </div>
      )}
      <>
        <div
          css={css`
            overflow: auto;
            border: ${euiTheme.border.thin};
            border-radius: 16px;
            background: ${transparentize(euiTheme.colors.primary, 0.025)};
          `}
        >
          <div
            style={{ width: graph.width, height: graph.height }}
            css={css`
              position: relative;
              background-image: radial-gradient(
                ${transparentize(euiTheme.colors.mediumShade, 0.2)} 0.7px,
                transparent 0.7px
              );
              background-size: 20px 20px;
            `}
          >
            <svg
              width={graph.width}
              height={graph.height}
              aria-hidden="true"
              css={css`
                position: absolute;
                inset: 0;
                pointer-events: none;
              `}
            >
              {actorLabel && (
                <path
                  data-test-subj="agentGraphActorEdge"
                  d="M 190 92 H 230"
                  stroke={euiTheme.colors.mediumShade}
                  strokeWidth="1.5"
                  fill="none"
                />
              )}
              <path
                d="M 454 92 H 500"
                stroke={euiTheme.colors.primary}
                strokeWidth="1.6"
                fill="none"
              />
              {graph.tools.map((tool) => (
                <path
                  key={tool.id}
                  data-test-subj="agentGraphToolEdge"
                  d={`M 808 92 H ${graph.width - 12} V ${tool.y - 24} H ${tool.x + 105} V ${
                    tool.y
                  }`}
                  stroke={euiTheme.colors.primary}
                  strokeOpacity="0.35"
                  strokeWidth="1.4"
                  fill="none"
                />
              ))}
            </svg>
            <AgentActorCard
              invocation={invocation}
              resolvedActor={resolvedActor}
              isLoading={isActorLoading}
            />
            <div css={card} style={{ left: 230, top: 46, width: 224, height: 92 }}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ProviderIcon provider="elastic" size={30} />
                </EuiFlexItem>
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText size="s" css={clipped}>
                    <strong>{agent.name}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {'Agent Builder'}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <button
              type="button"
              onClick={onSelectInvocation}
              data-test-subj="agentGraphConversation"
              css={[
                card,
                interactive,
                css`
                  border-color: ${securityCount > 0
                    ? euiTheme.colors[securityColor]
                    : euiTheme.colors.primary};
                `,
              ]}
              style={{ left: 500, top: 38, width: 308, height: 110 }}
            >
              <EuiText size="s" css={clipped}>
                <strong>
                  {conversationTitle ??
                    i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.invocation',
                      { defaultMessage: 'Agent invocation' }
                    )}
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <AgentTimestamp value={invocation.timestamp} />
              </EuiText>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="s"
                responsive={false}
                css={css`
                  margin-top: 8px;
                `}
              >
                <EuiFlexItem grow={false}>
                  <AgentOutcome outcome={invocation.outcome} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="comment" color="primary" aria-hidden={true} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </button>
            {securityCount > 0 && (
              <EuiBadge
                color={securityColor}
                iconType="shield"
                title={securityLabel}
                data-test-subj="agentGraphSecurityBadge"
                css={css`
                  position: absolute;
                  left: 700px;
                  top: 24px;
                `}
              >
                {securityNodes.every((node) => node.agentCall)
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.flaggedCallBadge',
                      {
                        defaultMessage:
                          '{count, plural, one {# flagged call} other {# flagged calls}}',
                        values: { count: securityNodes.length },
                      }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.findingBadge',
                      {
                        defaultMessage: '{count, number} findings',
                        values: { count: securityCount },
                      }
                    )}
              </EuiBadge>
            )}
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                position: absolute;
                left: 210px;
                top: ${166 + securityHeight}px;
              `}
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.observedCalls',
                {
                  defaultMessage:
                    '{count, number} attributed tool {count, plural, one {call} other {calls}} · click to inspect inputs',
                  values: { count: graph.callCount },
                }
              )}
            </EuiText>
            {graph.tools.map((tool) => (
              <EuiToolTip
                key={tool.id}
                content={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.toolOutcomes',
                  {
                    defaultMessage:
                      '{success, number} completed, {failure, number} failed, {unknown, number} outcome not recorded',
                    values: {
                      success: tool.successes,
                      failure: tool.failures,
                      unknown: tool.unknowns,
                    },
                  }
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectTool(tool.calls[0])}
                  css={[card, interactive]}
                  style={{ left: tool.x, top: tool.y, width: 210, height: 76 }}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.inspectTool',
                    {
                      defaultMessage: 'Inspect {tool} calls',
                      values: {
                        tool: tool.nameRedacted
                          ? i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.withheldTool',
                              { defaultMessage: 'withheld tool' }
                            )
                          : tool.name,
                      },
                    }
                  )}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={/search|esql|query/.test(tool.name) ? 'search' : 'consoleApp'}
                        color="primary"
                        aria-hidden={true}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem
                      css={css`
                        min-width: 0;
                      `}
                    >
                      <EuiText size="xs" css={clipped}>
                        <strong>
                          {tool.nameRedacted
                            ? i18n.translate(
                                'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.toolWithheld',
                                { defaultMessage: 'Name withheld' }
                              )
                            : tool.name}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{tool.calls.length}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiText
                    size="xs"
                    color={tool.failures ? 'danger' : 'subdued'}
                    css={css`
                      margin-top: 7px;
                    `}
                  >
                    {findings.some((finding) =>
                      tool.calls.some((call) => findingMatchesAgentToolCall(finding, call))
                    ) && (
                      <EuiIcon
                        type="shield"
                        color="warning"
                        title={i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.matchedPolicy',
                          { defaultMessage: 'Tool call matched a policy' }
                        )}
                      />
                    )}
                    {'✓ '}
                    {tool.successes}
                    {'  ! '}
                    {tool.failures}
                    {'  ? '}
                    {tool.unknowns}
                  </EuiText>
                </button>
              </EuiToolTip>
            ))}
            {security && (
              <SecurityGraphNodes
                scope={security.scope}
                invocations={hasNativeFindings}
                agentCalls={toolCalls}
                onInspectAgentCall={onSelectTool}
                result={security.result}
                contextKey={contextKey}
                source={{ x: 654, y: 148 }}
                left={180}
                top={218}
                width={graph.width}
                height={graph.height}
              />
            )}
          </div>
        </div>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.coverage',
            {
              defaultMessage:
                'Trace ancestry links these calls. Comparisons need matched history; delegated credentials remain unverified.',
            }
          )}
          {graph.omittedTools > 0 &&
            i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.moreTools',
              {
                defaultMessage: ' {count, number} additional tool groups are in the table below.',
                values: { count: graph.omittedTools },
              }
            )}
        </EuiText>
      </>
    </section>
  );
};
