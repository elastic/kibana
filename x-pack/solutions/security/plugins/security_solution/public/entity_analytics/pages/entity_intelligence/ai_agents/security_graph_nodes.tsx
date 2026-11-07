/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FindingDetails, activityLabel } from '../security_findings/security_findings_panel';
import { FindingResponseLink } from '../security_findings/finding_response_evidence';
import { getFindingResponse } from '../security_findings/response_evidence';
import type {
  SecurityFinding,
  SecurityFindingScope,
  SecurityFindingsResult,
} from '../security_findings/types';
import { AgentTimestamp } from './agent_evidence';
import type { CodexToolEvent } from './codex_types';
import type { AgentToolCall } from './types';
import {
  buildSecurityGraphNodes,
  readableSecurityFindings,
  SECURITY_GRAPH_CARD,
  SECURITY_INVOCATION_CARD_HEIGHT,
  securityInvocationCommand,
  securityFindingKey,
} from './security_graph_model';
import type { SecurityGraphEvidence } from './security_graph_model';

export interface SecurityGraphNodesProps {
  scope: SecurityFindingScope;
  result: SecurityFindingsResult;
  contextKey: string;
  source: { x: number; y: number };
  left: number;
  top: number;
  width: number;
  height: number;
  invocations?: boolean;
  events?: CodexToolEvent[];
  agentCalls?: AgentToolCall[];
  onInspectAgentCall?: (call: AgentToolCall) => void;
  onInspectEvent?: (event: CodexToolEvent) => void;
}

export const securityGraphOutcome = (finding: SecurityFinding): string =>
  finding.outcome === 'blocked'
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.securityGraph.blocked', {
        defaultMessage: 'Blocked',
      })
    : finding.kind === 'policy_violation'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.violation',
        { defaultMessage: 'Allowed despite policy' }
      )
    : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.securityGraph.detected', {
        defaultMessage: 'Detected',
      });

const ToolPolicyRecords: React.FC<{
  findings: SecurityFinding[];
  onSelect: (finding: SecurityFinding) => void;
  compact?: boolean;
}> = ({ findings, onSelect, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPopover
      isOpen={isOpen}
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.policyEvidencePopover',
        { defaultMessage: 'Policies and evidence for this tool call' }
      )}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="shield"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="securityGraphPolicyRecords"
        >
          {compact
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.compactPolicyRecords',
                { defaultMessage: '{count, number} policies', values: { count: findings.length } }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.policyRecords',
                {
                  defaultMessage: '{count, number} policy records',
                  values: { count: findings.length },
                }
              )}
        </EuiButtonEmpty>
      }
    >
      <div
        css={css`
          width: 320px;
          max-width: 70vw;
        `}
      >
        <EuiText size="s">
          <strong>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.sameCallTitle',
              { defaultMessage: 'One tool call, multiple evidence records' }
            )}
          </strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.sameCallDescription',
            {
              defaultMessage:
                'These policies refer to the same recorded invocation. Open a record to inspect its policy and supporting evidence.',
            }
          )}
        </EuiText>
        {findings.map((finding) => (
          <div
            key={securityFindingKey(finding)}
            css={css`
              margin-top: ${euiTheme.size.m};
              padding-top: ${euiTheme.size.s};
              border-top: ${euiTheme.border.thin};
            `}
          >
            <EuiBadge color={finding.outcome === 'blocked' ? 'primary' : 'warning'}>
              {securityGraphOutcome(finding)}
            </EuiBadge>
            <div>
              <EuiButtonEmpty
                size="s"
                flush="left"
                onClick={() => {
                  setIsOpen(false);
                  onSelect(finding);
                }}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.policy',
                  {
                    defaultMessage: 'Inspect policy {policy}',
                    values: { policy: finding.policy?.name ?? finding.rule.name },
                  }
                )}
              >
                {finding.policy?.name ?? finding.rule.name}
              </EuiButtonEmpty>
            </div>
            <EuiText size="xs" color="subdued">
              {finding.title}
            </EuiText>
          </div>
        ))}
      </div>
    </EuiPopover>
  );
};

export const SecurityGraphNodes: React.FC<SecurityGraphNodesProps> = ({
  result,
  contextKey,
  source,
  left,
  top,
  width,
  height,
  invocations = false,
  events = [],
  agentCalls = [],
  onInspectAgentCall,
  onInspectEvent,
}) => {
  const { euiTheme } = useEuiTheme();
  const cardHeight = invocations ? SECURITY_INVOCATION_CARD_HEIGHT : SECURITY_GRAPH_CARD.height;
  const markerId = useGeneratedHtmlId({ prefix: 'securityEventArrow' });
  const findings = readableSecurityFindings(result);
  const allNodes = buildSecurityGraphNodes(findings, { events, agentCalls });
  const [pageSelection, setPageSelection] = useState<{ contextKey: string; page: number }>();
  const requestedPage = pageSelection?.contextKey === contextKey ? pageSelection.page : 0;
  const page = Math.min(requestedPage, Math.max(0, Math.ceil(allNodes.length / 6) - 1));
  const nodes = allNodes
    .slice(page * 6, (page + 1) * 6)
    .map((node, index) => ({ ...node, row: Math.floor(index / 3), column: index % 3 }));
  const positions = new Map(
    nodes.map((node) => [
      node.key,
      {
        x: left + node.column * (SECURITY_GRAPH_CARD.width + SECURITY_GRAPH_CARD.gap),
        y: top + node.row * (cardHeight + SECURITY_GRAPH_CARD.rowGap),
      },
    ])
  );
  const [selection, setSelection] = useState<{ contextKey: string; key: string }>();
  const selected =
    selection?.contextKey === contextKey
      ? findings.find((finding) => securityFindingKey(finding) === selection.key)
      : undefined;
  useEffect(() => {
    setSelection(undefined);
  }, [contextKey, result.isLoading, result.isRefreshing, result.unavailable]);
  const clipped = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  return (
    <>
      {nodes.length > 0 && (
        <>
          <svg
            width={width}
            height={height}
            aria-hidden="true"
            css={css`
              position: absolute;
              inset: 0;
              pointer-events: none;
            `}
          >
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill={invocations ? euiTheme.colors.primary : euiTheme.colors.mediumShade}
                />
              </marker>
            </defs>
            {nodes.map((node) => {
              const position = positions.get(node.key);
              if (!position) return null;
              const path =
                position.y > top
                  ? `M ${source.x} ${source.y} V ${top - 24} H ${left - 16} V ${
                      position.y - 14
                    } H ${position.x + SECURITY_GRAPH_CARD.width / 2} V ${position.y}`
                  : `M ${source.x} ${source.y} V ${top - 24} H ${
                      position.x + SECURITY_GRAPH_CARD.width / 2
                    } V ${position.y}`;
              return (
                <path
                  key={node.key}
                  data-test-subj="securityGraphSessionLink"
                  d={path}
                  stroke={invocations ? euiTheme.colors.primary : euiTheme.colors.mediumShade}
                  strokeWidth="1.6"
                  strokeDasharray={invocations ? undefined : '4 4'}
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}
          </svg>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            css={css`
              position: absolute;
            `}
            style={{
              left,
              top: top - 52,
              width: SECURITY_GRAPH_CARD.width * 3 + SECURITY_GRAPH_CARD.gap * 2,
            }}
          >
            <EuiFlexItem>
              <EuiText size="xs">
                <strong>
                  {invocations
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.invocationEvents',
                        { defaultMessage: 'Tool calls with security findings' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.events',
                        {
                          defaultMessage:
                            'Invocation-level findings · tool attribution unavailable',
                        }
                      )}
                </strong>
              </EuiText>
            </EuiFlexItem>
            {allNodes.length > 6 && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.page',
                      {
                        defaultMessage: '{first, number}–{last, number} of {count, number}',
                        values: {
                          first: page * 6 + 1,
                          last: Math.min((page + 1) * 6, allNodes.length),
                          count: allNodes.length,
                        },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="chevronSingleLeft"
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.previous',
                      { defaultMessage: 'Previous security findings' }
                    )}
                    isDisabled={page === 0}
                    onClick={() => setPageSelection({ contextKey, page: page - 1 })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="chevronSingleRight"
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.next',
                      { defaultMessage: 'Next security findings' }
                    )}
                    isDisabled={(page + 1) * 6 >= allNodes.length}
                    onClick={() => setPageSelection({ contextKey, page: page + 1 })}
                  />
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
          {nodes.map((node) => {
            const position = positions.get(node.key);
            if (!position) return null;
            const finding = node.finding;
            const color =
              finding.outcome === 'blocked'
                ? 'primary'
                : finding.kind === 'policy_violation'
                ? 'danger'
                : 'warning';
            const invocation = invocations ? finding.invocation : undefined;
            const { event, agentCall } = node;
            const responseFinding = node.findings.find((item) => getFindingResponse(item));
            const inspect =
              event && onInspectEvent
                ? { id: event.id, onClick: () => onInspectEvent(event) }
                : agentCall && onInspectAgentCall
                ? {
                    id: agentCall.toolCallId ?? agentCall.spanId,
                    onClick: () => onInspectAgentCall(agentCall),
                  }
                : undefined;
            const action = finding.action ? activityLabel(finding.action) : finding.title;
            const inspectLabel = inspect
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.toolEvidence',
                  { defaultMessage: 'Inspect exact tool call {id}', values: { id: inspect.id } }
                )
              : undefined;
            const command = invocation ? securityInvocationCommand(invocation.input) : undefined;
            const selectFinding = (item: SecurityFinding) =>
              setSelection({ contextKey, key: securityFindingKey(item) });
            const openFinding = () => selectFinding(finding);
            return (
              <div
                key={node.key}
                css={css`
                  position: absolute;
                  border: 1px solid ${euiTheme.colors[color]};
                  border-left-width: 4px;
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${euiTheme.colors.emptyShade};
                  color: ${euiTheme.colors.textParagraph};
                  box-shadow: 0 3px 10px ${transparentize(euiTheme.colors[color], 0.1)};
                  overflow: hidden;
                `}
                style={{
                  left: position.x,
                  top: position.y,
                  width: SECURITY_GRAPH_CARD.width,
                  height: cardHeight,
                }}
              >
                <button
                  type="button"
                  data-test-subj="securityGraphEvent"
                  onClick={openFinding}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.inspect',
                    {
                      defaultMessage: 'Investigate finding {number}: {action}, {outcome}',
                      values: {
                        number: node.number,
                        action: invocation?.toolName ?? action,
                        outcome: securityGraphOutcome(finding),
                      },
                    }
                  )}
                  css={css`
                    width: 100%;
                    padding: ${euiTheme.size.m};
                    border: none;
                    background: transparent;
                    color: inherit;
                    text-align: left;
                    cursor: pointer;
                    &:hover {
                      background: ${euiTheme.colors.lightestShade};
                    }
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                      outline-offset: -2px;
                    }
                  `}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={invocation ? 'consoleApp' : 'shield'}
                        color={color}
                        aria-hidden={true}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem
                      css={css`
                        min-width: 0;
                      `}
                    >
                      <EuiText size="s" css={clipped} title={invocation?.toolName ?? action}>
                        <strong>{invocation?.toolName ?? action}</strong>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {command && (
                    <EuiText
                      size="xs"
                      data-test-subj="securityGraphCommand"
                      title={command}
                      css={css`
                        margin-top: ${euiTheme.size.s};
                        padding: ${euiTheme.size.s};
                        font-family: ${euiTheme.font.familyCode};
                        line-height: 1.4;
                        height: 51px;
                        overflow: hidden;
                        overflow-wrap: anywhere;
                        background: ${euiTheme.colors.lightestShade};
                        border-radius: ${euiTheme.border.radius.small};
                      `}
                    >
                      {command.length > 144
                        ? `${command.slice(0, 48)}…${command.slice(-95)}`
                        : command}
                    </EuiText>
                  )}
                  <EuiBadge
                    color={color}
                    css={css`
                      margin-top: ${euiTheme.size.xs};
                    `}
                  >
                    {securityGraphOutcome(finding)}
                  </EuiBadge>
                  <EuiText
                    size="xs"
                    css={[
                      clipped,
                      css`
                        margin-top: ${euiTheme.size.xs};
                      `,
                    ]}
                    title={invocation ? action : finding.target}
                  >
                    {invocation
                      ? `${action}${finding.target ? ` · ${finding.target}` : ''}`
                      : finding.target ?? finding.rule.name}
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    <AgentTimestamp value={event?.timestamp ?? finding.timestamp} />
                  </EuiText>
                  {invocation && (
                    <EuiText size="xs" color="subdued" data-test-subj="securityGraphCallEvidence">
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.callEvidence',
                        {
                          defaultMessage:
                            '1 tool call · {count, plural, one {# finding} other {# findings}}',
                          values: { count: node.findings.length },
                        }
                      )}
                    </EuiText>
                  )}
                </button>
                {invocation && (
                  <div
                    css={css`
                      padding: 0 ${euiTheme.size.s};
                      border-top: ${euiTheme.border.thin};
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      gap: ${euiTheme.size.xs};
                    `}
                  >
                    {node.findings.length > 1 ? (
                      <ToolPolicyRecords
                        findings={node.findings}
                        onSelect={selectFinding}
                        compact={Boolean(responseFinding)}
                      />
                    ) : (
                      <EuiButtonEmpty
                        size="xs"
                        iconType="shield"
                        onClick={openFinding}
                        title={finding.policy?.name ?? finding.rule.name}
                        aria-label={i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.policy',
                          {
                            defaultMessage: 'Inspect policy {policy}',
                            values: { policy: finding.policy?.name ?? finding.rule.name },
                          }
                        )}
                      >
                        <span
                          css={[
                            clipped,
                            css`
                              max-width: ${responseFinding ? '74px' : '122px'};
                              display: block;
                            `,
                          ]}
                        >
                          {finding.policy?.name ?? finding.rule.name}
                        </span>
                      </EuiButtonEmpty>
                    )}
                    {responseFinding && <FindingResponseLink finding={responseFinding} />}
                    {inspect && responseFinding ? (
                      <EuiToolTip content={inspectLabel} disableScreenReaderOutput>
                        <EuiButtonIcon
                          size="xs"
                          iconType="inspect"
                          onClick={inspect.onClick}
                          aria-label={inspectLabel}
                        />
                      </EuiToolTip>
                    ) : (
                      inspect && (
                        <EuiButtonEmpty
                          size="xs"
                          iconType="inspect"
                          onClick={inspect.onClick}
                          aria-label={inspectLabel}
                        >
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.toolLabel',
                            { defaultMessage: 'Tool call' }
                          )}
                        </EuiButtonEmpty>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      {selected && <FindingDetails finding={selected} onClose={() => setSelection(undefined)} />}
    </>
  );
};

export const SessionSecurityRemainder: React.FC<{
  findings: SecurityFinding[];
  contextKey: string;
  attributed?: boolean;
}> = ({ findings, contextKey, attributed = false }) => {
  const id = useGeneratedHtmlId({ prefix: 'sessionSecurityRemainder' });
  const [selectedKey, setSelectedKey] = useState<string>();
  const selected = findings.find((finding) => securityFindingKey(finding) === selectedKey);
  useEffect(() => setSelectedKey(undefined), [contextKey]);
  useEffect(() => {
    if (selectedKey && !selected) setSelectedKey(undefined);
  }, [selectedKey, selected]);
  if (!findings.length) return null;
  return (
    <>
      <EuiAccordion
        id={id}
        paddingSize="m"
        buttonContent={
          attributed
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.unloadedCalls',
                {
                  defaultMessage: 'Tool evidence outside loaded activity ({count, number})',
                  values: { count: findings.length },
                }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.sessionOnly',
                {
                  defaultMessage:
                    'Session-level findings · tool attribution unavailable ({count, number})',
                  values: { count: findings.length },
                }
              )
        }
      >
        <EuiText size="xs" color="subdued">
          <p>
            {attributed
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.unloadedDetail',
                  {
                    defaultMessage:
                      'These findings reference tool calls that are not in the loaded activity. Open a finding for its exact source reference.',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.sessionOnlyDetail',
                  {
                    defaultMessage:
                      'The source links these findings to this session, but does not identify a specific prompt or tool call.',
                  }
                )}
          </p>
        </EuiText>
        {findings.map((finding) => (
          <div key={securityFindingKey(finding)}>
            <EuiButtonEmpty
              size="s"
              iconType="shield"
              onClick={() => setSelectedKey(securityFindingKey(finding))}
            >
              {finding.title}
              {' · '}
              {securityGraphOutcome(finding)}
            </EuiButtonEmpty>
          </div>
        ))}
      </EuiAccordion>
      {selected && <FindingDetails finding={selected} onClose={() => setSelectedKey(undefined)} />}
    </>
  );
};

export const SecurityGraphSummary: React.FC<
  { result: SecurityFindingsResult } & SecurityGraphEvidence
> = ({ result, events, agentCalls }) => {
  const findings = readableSecurityFindings(result);
  const nodes = buildSecurityGraphNodes(findings, { events, agentCalls });
  if (result.isLoading || result.isRefreshing)
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.loading',
          { defaultMessage: 'Loading security findings…' }
        )}
      </EuiText>
    );
  if (result.unavailable)
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.unavailable',
          { defaultMessage: 'Security findings unavailable' }
        )}
      </EuiText>
    );
  if (!findings.length)
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.securityGraph.none', {
          defaultMessage: 'No linked security findings in the available evidence',
        })}
      </EuiText>
    );
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      {(['blocked', 'violation', 'detected'] as const).map((kind) => {
        const count = nodes.filter(({ finding }) =>
          kind === 'blocked'
            ? finding.outcome === 'blocked'
            : kind === 'violation'
            ? finding.outcome !== 'blocked' && finding.kind === 'policy_violation'
            : finding.outcome !== 'blocked' && finding.kind !== 'policy_violation'
        ).length;
        return count > 0 ? (
          <EuiFlexItem grow={false} key={kind}>
            <EuiBadge
              color={kind === 'blocked' ? 'primary' : kind === 'violation' ? 'danger' : 'warning'}
            >
              {kind === 'blocked'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.blockedCount',
                    { defaultMessage: '{count, number} blocked', values: { count } }
                  )
                : kind === 'violation'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.violationCount',
                    { defaultMessage: '{count, number} allowed despite policy', values: { count } }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.detectedCount',
                    { defaultMessage: '{count, number} detected', values: { count } }
                  )}
            </EuiBadge>
          </EuiFlexItem>
        ) : null;
      })}
      {nodes.length < findings.length && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.groupedEvidence',
              {
                defaultMessage:
                  '{count, plural, one {# finding} other {# findings}} · counted once per recorded tool call',
                values: { count: findings.length },
              }
            )}
          </EuiText>
        </EuiFlexItem>
      )}
      {result.partial && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityGraph.partial',
              { defaultMessage: 'Partial evidence' }
            )}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
