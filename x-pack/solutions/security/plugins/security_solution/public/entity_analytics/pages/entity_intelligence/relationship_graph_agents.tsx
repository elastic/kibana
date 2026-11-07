/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { ProviderIcon } from './ai_agents/provider_icon';
import { securityInvocationCommand } from './ai_agents/security_graph_model';
import { securityGraphOutcome } from './ai_agents/security_graph_nodes';
import { entityAgentSessionPath } from './entity_agent_activity_model';
import {
  relationshipAgentAttribution,
  relationshipAgentRuntimeLabel,
} from './relationship_graph_attribution';
import { FindingResponseLink } from './security_findings/finding_response_evidence';
import type { SecurityFinding } from './security_findings/types';
import type { RelationshipAgentLayout } from './relationship_graph_agents_model';
import { RELATIONSHIP_AGENT_HANDOFF_WIDTH } from './relationship_graph_agents_model';

const Policies: React.FC<{
  findings: SecurityFinding[];
  onSelect: (finding: SecurityFinding) => void;
}> = ({ findings, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  if (findings.length === 1) {
    return (
      <EuiButtonEmpty size="xs" iconType="shield" onClick={() => onSelect(findings[0])}>
        {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agentGraph.policy', {
          defaultMessage: 'Policy',
        })}
      </EuiButtonEmpty>
    );
  }
  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.policiesLabel',
        {
          defaultMessage: 'Policies for this tool call',
        }
      )}
      button={
        <EuiButtonEmpty size="xs" iconType="shield" onClick={() => setIsOpen(!isOpen)}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.policies',
            {
              defaultMessage: '{count, number} policies',
              values: { count: findings.length },
            }
          )}
        </EuiButtonEmpty>
      }
    >
      <div
        css={css`
          max-width: 300px;
          display: grid;
          gap: ${euiTheme.size.s};
        `}
      >
        {findings.map((finding) => (
          <EuiButtonEmpty
            key={JSON.stringify([finding.source.index, finding.source.id])}
            size="s"
            flush="left"
            onClick={() => {
              setIsOpen(false);
              onSelect(finding);
            }}
          >
            {finding.policy?.name ?? finding.rule.name}
          </EuiButtonEmpty>
        ))}
      </div>
    </EuiPopover>
  );
};

/** Renders entity, agent, session and tool evidence together inside the relationship graph SVG. */
export const RelationshipAgentNodes: React.FC<{
  layout: RelationshipAgentLayout;
  onSelectFinding: (finding: SecurityFinding) => void;
}> = ({ layout, onSelectFinding }) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const markerId = useGeneratedHtmlId({ prefix: 'relationshipAgentArrow' });
  const card = css`
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.m};
    background: ${euiTheme.colors.backgroundBasePlain};
    color: ${euiTheme.colors.textParagraph};
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
  `;
  const clipped = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  `;
  const line = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    min-width: 0;
  `;
  const { area } = layout;
  if (!layout.sessions.length || !area) return null;
  return (
    <g data-test-subj="entityGraphAgentActivity">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={euiTheme.colors.primary} />
        </marker>
      </defs>
      <g data-test-subj="entityGraphAgentWorkArea" pointerEvents="none">
        <rect
          {...area}
          rx={18}
          fill={euiTheme.colors.primary}
          fillOpacity={0.035}
          stroke={euiTheme.colors.primary}
          strokeOpacity={0.25}
        />
        <text
          x={area.x + 24}
          y={area.y + 30}
          fill={euiTheme.colors.textPrimary}
          fontSize={16}
          fontWeight={600}
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.workArea',
            { defaultMessage: 'Work performed by agents' }
          )}
        </text>
        <line
          x1={area.x + 24}
          x2={area.x + area.width - 24}
          y1={area.y + 46}
          y2={area.y + 46}
          stroke={euiTheme.colors.primary}
          strokeOpacity={0.18}
        />
      </g>
      {[
        {
          x: layout.agents[0].x,
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.agentColumn',
            {
              defaultMessage: 'Agent',
            }
          ),
        },
        {
          x: layout.sessions[0].x,
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.sessionColumn',
            {
              defaultMessage: 'Session',
            }
          ),
        },
        {
          x: layout.actions[0].x,
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.toolColumn',
            {
              defaultMessage: 'Tool action',
            }
          ),
        },
      ].map((column) => (
        <text
          key={column.label}
          x={column.x}
          y={area.y + 68}
          fill={euiTheme.colors.textSubdued}
          fontSize={11}
          fontWeight={600}
          pointerEvents="none"
        >
          {column.label}
        </text>
      ))}
      {layout.edges.map((edge) => {
        const handoffEntry = edge.kind === 'attribution' ? edge.via?.[0] : undefined;
        const curveEnd = handoffEntry ?? edge.to;
        const middle = edge.from.x + (curveEnd.x - edge.from.x) / 2;
        const attribution = relationshipAgentAttribution(edge.attribution);
        return (
          <path
            key={edge.key}
            data-test-subj={`entityGraphAgentEdge-${edge.kind}`}
            d={
              edge.via && !handoffEntry
                ? `M ${edge.from.x} ${edge.from.y} ${[...edge.via, edge.to]
                    .map((point) => `L ${point.x} ${point.y}`)
                    .join(' ')}`
                : `M ${edge.from.x} ${edge.from.y} C ${middle} ${edge.from.y}, ${middle} ${
                    curveEnd.y
                  }, ${curveEnd.x} ${curveEnd.y}${
                    handoffEntry ? ` L ${edge.to.x} ${edge.to.y}` : ''
                  }`
            }
            stroke={euiTheme.colors.primary}
            strokeOpacity={0.6}
            strokeWidth={edge.kind === 'attribution' ? 2.2 : 1.6}
            strokeDasharray={
              edge.kind === 'attribution' && !attribution.verified ? '4 4' : undefined
            }
            fill="none"
            markerEnd={`url(#${markerId})`}
            pointerEvents="none"
          >
            <title>
              {edge.kind === 'attribution'
                ? attribution.description
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.recordedLink',
                    { defaultMessage: 'Linked by the recorded agent and session identity' }
                  )}
            </title>
          </path>
        );
      })}
      {layout.edges
        .filter((edge) => edge.kind === 'attribution')
        .map((edge) => {
          const attribution = relationshipAgentAttribution(edge.attribution);
          return (
            <foreignObject
              key={`label:${edge.key}`}
              x={edge.to.x - RELATIONSHIP_AGENT_HANDOFF_WIDTH - 40}
              y={edge.to.y - 30}
              width={RELATIONSHIP_AGENT_HANDOFF_WIDTH}
              height={60}
              data-test-subj="entityGraphAgentHandoff"
            >
              <EuiToolTip content={attribution.description}>
                <div
                  role="note"
                  tabIndex={0}
                  aria-label={`${attribution.label}. ${attribution.description}`}
                  css={css`
                    width: ${RELATIONSHIP_AGENT_HANDOFF_WIDTH}px;
                    height: 60px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: ${euiTheme.size.xs};
                    padding: ${euiTheme.size.s};
                    border: ${euiTheme.border.thin};
                    border-color: ${attribution.verified
                      ? euiTheme.colors.primary
                      : euiTheme.colors.borderBasePlain};
                    border-style: ${attribution.verified ? 'solid' : 'dashed'};
                    border-radius: ${euiTheme.border.radius.medium};
                    background: ${euiTheme.colors.backgroundBasePlain};
                    text-align: center;
                  `}
                >
                  <EuiText size="xs" color={attribution.verified ? 'primary' : 'subdued'}>
                    <strong>{attribution.label}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {attribution.evidence}
                  </EuiText>
                </div>
              </EuiToolTip>
            </foreignObject>
          );
        })}
      {layout.agents.map((agent) => (
        <foreignObject
          key={agent.key}
          x={agent.x}
          y={agent.y}
          width={agent.width}
          height={agent.height}
          data-test-subj="entityGraphAgentNode"
        >
          <div css={card} onMouseDown={(event) => event.stopPropagation()}>
            <div css={line}>
              <ProviderIcon
                provider={agent.provider === 'agent_builder' ? 'elastic' : agent.provider}
                size={28}
              />
              <EuiText size="s" css={clipped} title={agent.name}>
                <strong>{agent.name}</strong>
              </EuiText>
            </div>
            <div
              role="note"
              aria-label={relationshipAgentRuntimeLabel(agent.runtimePrincipal)}
              title={relationshipAgentRuntimeLabel(agent.runtimePrincipal)}
            >
              {agent.runtimePrincipal ? (
                <>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.runsAs',
                      { defaultMessage: 'Runs as' }
                    )}
                  </EuiText>
                  <EuiText size="xs" css={clipped}>
                    {agent.runtimePrincipal}
                  </EuiText>
                </>
              ) : (
                <EuiText size="xs" color="subdued">
                  {relationshipAgentRuntimeLabel()}
                </EuiText>
              )}
            </div>
          </div>
        </foreignObject>
      ))}
      {layout.sessions.map((session) => {
        const path = entityAgentSessionPath(session.findings[0]);
        return (
          <foreignObject
            key={session.key}
            x={session.x}
            y={session.y}
            width={session.width}
            height={session.height}
            data-test-subj="entityGraphAgentSession"
          >
            <div css={card} onMouseDown={(event) => event.stopPropagation()}>
              <div css={line}>
                <EuiIcon type="comment" color="primary" aria-hidden={true} />
                <EuiText
                  size="s"
                  title={session.title}
                  css={css`
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 18px;
                  `}
                >
                  <strong>{session.title}</strong>
                </EuiText>
              </div>
              <EuiText size="xs" color="subdued" title={session.id} css={clipped}>
                {new Date(session.timestamp).toLocaleString()}
              </EuiText>
              {path && (
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  href={application.getUrlForApp('securitySolutionUI', { path })}
                  iconType="sortRight"
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.openSession',
                    {
                      defaultMessage:
                        'Open session · {count, number} {count, plural, one {action} other {actions}}',
                      values: { count: session.totalActions },
                    }
                  )}
                </EuiButtonEmpty>
              )}
            </div>
          </foreignObject>
        );
      })}
      {layout.actions.map((action) => {
        const { finding } = action;
        const color =
          finding.outcome === 'blocked'
            ? euiTheme.colors.primary
            : finding.kind === 'policy_violation'
            ? euiTheme.colors.danger
            : euiTheme.colors.warning;
        const preview = securityInvocationCommand(finding.invocation?.input ?? '');
        return (
          <foreignObject
            key={action.key}
            x={action.x}
            y={action.y}
            width={action.width}
            height={action.height}
            data-test-subj="entityGraphAgentTool"
          >
            <div
              css={[
                card,
                css`
                  border-color: ${color};
                  border-left-width: 3px;
                `,
              ]}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div css={line}>
                <EuiIcon type="commandLine" color={color} aria-hidden={true} />
                <button
                  type="button"
                  css={css`
                    font: inherit;
                    font-size: ${euiTheme.font.scale.s * 16}px;
                    font-weight: ${euiTheme.font.weight.semiBold};
                    text-align: left;
                    color: ${euiTheme.colors.textParagraph};
                    ${clipped};
                    &:hover {
                      text-decoration: underline;
                    }
                  `}
                  onClick={() => onSelectFinding(finding)}
                  title={finding.invocation?.toolName}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.inspectTool',
                    {
                      defaultMessage: 'Inspect tool call {tool}',
                      values: { tool: finding.invocation?.toolName ?? finding.title },
                    }
                  )}
                >
                  {finding.invocation?.toolName}
                </button>
              </div>
              <div
                css={css`
                  display: flex;
                  gap: ${euiTheme.size.xs};
                `}
              >
                <EuiBadge
                  color={
                    finding.outcome === 'blocked'
                      ? 'primary'
                      : finding.kind === 'policy_violation'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {securityGraphOutcome(finding)}
                </EuiBadge>
                {action.riskInputs.length > 0 && (
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.riskContributor',
                      { defaultMessage: 'Risk contributor' }
                    )}
                  </EuiBadge>
                )}
              </div>
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  height: 34px;
                  flex: 1;
                  line-height: 17px;
                  overflow: hidden;
                  overflow-wrap: anywhere;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                `}
              >
                {preview ||
                  i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.noInput',
                    { defaultMessage: 'No input captured' }
                  )}
              </EuiText>
              <div
                css={css`
                  display: flex;
                  gap: ${euiTheme.size.xs};
                  align-items: center;
                  border-top: ${euiTheme.border.thin};
                  padding-top: ${euiTheme.size.xs};
                `}
              >
                <Policies findings={action.findings} onSelect={onSelectFinding} />
                <FindingResponseLink finding={finding} />
              </div>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
};
