/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SecurityGraphNodes,
  SecurityGraphSummary,
  SessionSecurityRemainder,
} from './security_graph_nodes';
import {
  readableSecurityFindings,
  securityGraphHeight,
  findingMatchesToolEvent,
  buildSecurityGraphNodes,
} from './security_graph_model';
import type { SecurityFindingScope, SecurityFindingsResult } from '../security_findings/types';
import { getCodexSessionTitle } from './codex_model';
import {
  externalAgentLabel,
  externalAgentGrouping,
  externalAgentGroupsInSentence,
  externalAgentMapLabel,
} from './external_agent_provider';
import { GoogleAdkContextPanel } from './google_adk_context';
import { ProviderIcon } from './provider_icon';
import {
  buildSessionGraph,
  SESSION_GRAPH_CARD,
  SESSION_GRAPH_TOOL_CARD,
} from './session_graph_model';
import type { SessionGraphNode } from './session_graph_model';
import type { CodexSession, CodexToolEvent } from './codex_types';

export interface CodexSessionGraphProps {
  sessions: CodexSession[];
  selected: CodexSession;
  security?: { scope: SecurityFindingScope; result: SecurityFindingsResult; spaceId?: string };
  events?: CodexToolEvent[];
  onInspectEvent?: (event: CodexToolEvent) => void;
  onSelectSession: (session: CodexSession) => void;
  onSelectTool: (name: string) => void;
}

const shortId = (id: string): string => (id.length > 13 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id);
const sessionLabel = (session: CodexSession): string => {
  if (session.title) return getCodexSessionTitle(session);
  if (session.nickname) return session.nickname;
  if (session.role === 'guardian_review') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.reviewSession',
      { defaultMessage: 'Review session' }
    );
  }
  if (session.role === 'user') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.mainSession',
      { defaultMessage: 'Main session' }
    );
  }
  return shortId(session.id);
};
const openSessionLabel = (session: CodexSession): string =>
  session.provider === 'claude_desktop'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.openConnection',
        {
          defaultMessage: 'Open MCP connection {session}',
          values: { session: sessionLabel(session) },
        }
      )
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.openSession',
        {
          defaultMessage: 'Open session {session}',
          values: { session: sessionLabel(session) },
        }
      );

const sessionSubtitle = (session: CodexSession): string =>
  session.agentPath?.split('/').filter(Boolean).at(-1) ??
  (session.role === 'user' || session.role === 'guardian_review'
    ? shortId(session.id)
    : session.model ?? externalAgentLabel(session.provider));
const toolIcon = (
  name: string
): 'consoleApp' | 'document' | 'search' | 'users' | 'globe' | 'image' => {
  if (/patch|edit|write|read_/i.test(name)) return 'document';
  if (/search|query/i.test(name)) return 'search';
  if (/agent|collab/i.test(name)) return 'users';
  if (/browse|fetch|web/i.test(name)) return 'globe';
  if (/image/i.test(name)) return 'image';
  return 'consoleApp';
};

const parentDescription = (node: SessionGraphNode): string => {
  if (node.parentState === 'missing' || node.parentState === 'outside_view') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.parentOutside',
      {
        defaultMessage: 'Recorded parent {id} is outside this view.',
        values: { id: node.session.parentId ?? '' },
      }
    );
  }
  if (node.parentState === 'cycle') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.parentCycle',
      {
        defaultMessage: 'Conflicting cyclic parent references; the parent connection is not drawn.',
      }
    );
  }
  if (node.parentState === 'linked') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.recordedParent',
      {
        defaultMessage: 'Recorded parent: {id}',
        values: { id: node.session.parentId ?? '' },
      }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.parentNotRecorded',
    {
      defaultMessage: 'No parent is recorded in this snapshot.',
    }
  );
};

export const CodexSessionGraph: React.FC<CodexSessionGraphProps> = ({
  sessions,
  selected,
  security,
  events = [],
  onInspectEvent,
  onSelectSession,
  onSelectTool,
}) => {
  const { euiTheme } = useEuiTheme();
  const markerId = useGeneratedHtmlId({ prefix: 'codexSessionArrow' });
  const [includeReviews, setIncludeReviews] = useState(false);
  const [includeOtherSessions, setIncludeOtherSessions] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contextKey = JSON.stringify([
    security?.spaceId,
    security?.scope.type === 'agent' ? security.scope.provider : selected.provider ?? 'codex',
    selected.agentId,
    selected.id,
  ]);
  const findings = readableSecurityFindings(security?.result);
  const sessionEvents = events.filter(
    (event) =>
      event.agentId === selected.agentId &&
      event.sessionId === selected.id &&
      (event.provider ?? 'codex') === (selected.provider ?? 'codex')
  );
  const invocationFindings = findings.filter((finding) =>
    sessionEvents.some((event) => findingMatchesToolEvent(finding, event))
  );
  const sessionFindings = findings.filter((finding) => !finding.invocation);
  const unloadedFindings = findings.filter(
    (finding) => finding.invocation && !invocationFindings.includes(finding)
  );
  const invocationNodes = buildSecurityGraphNodes(invocationFindings, { events: sessionEvents });
  const securityCount = findings.length;
  const securityNodes = buildSecurityGraphNodes(findings, { events: sessionEvents });
  const securityColor = securityNodes.some(
    ({ finding }) => finding.kind === 'policy_violation' && finding.outcome !== 'blocked'
  )
    ? 'danger'
    : securityNodes.every(({ finding }) => finding.outcome === 'blocked')
    ? 'primary'
    : 'warning';
  const [knownSecurityContext, setKnownSecurityContext] = useState<string>();
  const [expandedSessionContext, setExpandedSessionContext] = useState<string>();
  const collapseRelated =
    (securityCount > 0 || knownSecurityContext === contextKey) &&
    expandedSessionContext !== contextKey;
  useEffect(() => {
    if (securityCount > 0) setKnownSecurityContext(contextKey);
  }, [contextKey, securityCount]);
  const baseGraph = useMemo(
    () =>
      buildSessionGraph(sessions, selected, {
        includeReviewSessions: includeReviews,
        includeOtherSessions,
        maxLinkedSessions: collapseRelated ? 1 : 12,
      }),
    [sessions, selected, includeReviews, includeOtherSessions, collapseRelated]
  );
  const baseSelectedNode = baseGraph.sessions.find((node) => node.selected);
  const securityTop = (baseSelectedNode?.y ?? 40) + 132;
  const securityHeight = securityGraphHeight(invocationNodes.length, true);
  const shiftY = (y: number): number =>
    y > (baseSelectedNode?.y ?? 40) + 32 ? y + securityHeight : y;
  const graph = {
    ...baseGraph,
    sessions: baseGraph.sessions.map((node) => ({ ...node, y: shiftY(node.y) })),
    owner: { ...baseGraph.owner, y: shiftY(baseGraph.owner.y) },
    installation: { ...baseGraph.installation, y: shiftY(baseGraph.installation.y) },
    tools: baseGraph.tools.map((tool) => ({ ...tool, y: tool.y + securityHeight })),
    toolLaneY: baseGraph.toolLaneY + securityHeight,
    width: Math.max(baseGraph.width, securityCount > 0 ? 1020 : 0),
    height: baseGraph.height + securityHeight,
  };
  const nodes = new Map(graph.sessions.map((node) => [node.key, node]));
  const selectedNode = graph.sessions.find((node) => node.selected);
  const owner = selected.owner;
  const cloud = selected.googleAdk;
  const selectedNodeY = selectedNode?.y;
  useEffect(() => {
    if (canvasRef.current && selectedNodeY !== undefined)
      canvasRef.current.scrollTop = Math.max(0, selectedNodeY - 24);
  }, [contextKey, selectedNodeY, expandedSessionContext]);
  const securityLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.securityCount',
    {
      defaultMessage:
        '{count, plural, one {# security finding loaded for this session} other {# security findings loaded for this session}}',
      values: { count: securityCount },
    }
  );
  const card = css`
    width: 100%;
    height: 100%;
    padding: 10px;
    text-align: left;
    border: 1px solid ${euiTheme.colors.lightShade};
    border-radius: 12px;
    background: ${euiTheme.colors.emptyShade};
    color: ${euiTheme.colors.textParagraph};
    box-shadow: 0 3px 10px ${transparentize(euiTheme.colors.fullShade, 0.04)};
  `;
  const clickable = css`
    cursor: pointer;
    transition: border-color 120ms ease, box-shadow 120ms ease;
    &:hover {
      border-color: ${euiTheme.colors.primary};
      box-shadow: 0 4px 16px ${transparentize(euiTheme.colors.primary, 0.12)};
    }
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 3px;
    }
  `;
  const clipped = css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;
  const laneLabel = css`
    position: absolute;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textSubdued};
  `;
  const connection = (sourceX: number, sourceY: number, targetX: number, targetY: number): string =>
    `M ${sourceX} ${sourceY} C ${(sourceX + targetX) / 2} ${sourceY}, ${
      (sourceX + targetX) / 2
    } ${targetY}, ${targetX} ${targetY}`;

  return (
    <section
      data-test-subj="codexSessionGraph"
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.label',
        {
          defaultMessage: '{provider} {grouping} relationships and observed tools',
          values: {
            provider: externalAgentLabel(selected.provider),
            grouping: externalAgentGrouping(selected.provider),
          },
        }
      )}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        css={css`
          margin-bottom: ${euiTheme.size.m};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{externalAgentMapLabel(selected.provider)}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            {graph.reviewSessionCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  checked={includeReviews}
                  onChange={(event) => setIncludeReviews(event.target.checked)}
                  label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.includeReviews',
                    {
                      defaultMessage: 'Include review sessions ({count, number})',
                      values: { count: graph.reviewSessionCount },
                    }
                  )}
                />
              </EuiFlexItem>
            )}
            {!selected.summaryComplete && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.partial',
                    { defaultMessage: 'Partial snapshot' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {graph.omittedSessions > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.moreSessions',
                    {
                      defaultMessage: '{count, number} more {grouping}',
                      values: {
                        count: graph.omittedSessions,
                        grouping: externalAgentGrouping(selected.provider, true),
                      },
                    }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {cloud
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.graphLegend',
                      { defaultMessage: 'Authenticated request · observed tool execution' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.edgeLegend',
                      { defaultMessage: 'Recorded parentage · snapshot tool use' }
                    )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {security && (
        <div
          css={css`
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          <SecurityGraphSummary result={security.result} events={sessionEvents} />
        </div>
      )}
      {(securityCount > 0 || knownSecurityContext === contextKey) &&
        (graph.omittedSessions > 0 || expandedSessionContext === contextKey) && (
          <EuiButtonEmpty
            size="s"
            iconType={collapseRelated ? 'chevronSingleRight' : 'chevronSingleDown'}
            aria-expanded={!collapseRelated}
            onClick={() => setExpandedSessionContext(collapseRelated ? contextKey : undefined)}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.relatedSessions',
              {
                defaultMessage: 'Related sessions ({count, number})',
                values: {
                  count:
                    graph.sessions.filter((node) => node.group === 'selected_tree').length -
                    1 +
                    graph.omittedSessions,
                },
              }
            )}
          </EuiButtonEmpty>
        )}
      <>
        <div
          ref={canvasRef}
          css={css`
            overflow: auto;
            border: ${euiTheme.border.thin};
            border-radius: 16px;
            background: ${transparentize(euiTheme.colors.primary, 0.025)};
          `}
          style={{ height: Math.min(graph.height, 620) }}
        >
          <div
            css={css`
              position: relative;
              background-image: radial-gradient(
                ${transparentize(euiTheme.colors.mediumShade, 0.2)} 0.7px,
                transparent 0.7px
              );
              background-size: 20px 20px;
            `}
            style={{ width: graph.width, height: graph.height }}
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
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={euiTheme.colors.mediumShade} />
                </marker>
              </defs>
              {(owner || cloud) && (
                <path
                  data-test-subj="codexGraphOwnerLink"
                  d={connection(
                    graph.owner.x + 138,
                    graph.owner.y + 32,
                    graph.installation.x,
                    graph.installation.y + 32
                  )}
                  stroke={euiTheme.colors.mediumShade}
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                />
              )}
              {graph.roots.map((key) => {
                const node = nodes.get(key);
                return node ? (
                  <path
                    key={`installation-${key}`}
                    d={connection(
                      graph.installation.x + 150,
                      graph.installation.y + 32,
                      node.x,
                      node.y + 32
                    )}
                    stroke={euiTheme.colors.mediumShade}
                    strokeWidth="1.5"
                    fill="none"
                    markerEnd={`url(#${markerId})`}
                  />
                ) : null;
              })}
              {graph.parentEdges.map((edge) => {
                const source = nodes.get(edge.source);
                const target = nodes.get(edge.target);
                return source && target ? (
                  <path
                    key={`${edge.source}:${edge.target}`}
                    data-test-subj="codexGraphParentLink"
                    d={connection(
                      source.x + SESSION_GRAPH_CARD.width,
                      source.y + 32,
                      target.x,
                      target.y + 32
                    )}
                    stroke={euiTheme.colors.primary}
                    strokeOpacity="0.5"
                    strokeWidth="1.6"
                    fill="none"
                    markerEnd={`url(#${markerId})`}
                  />
                ) : null;
              })}
              {selectedNode &&
                graph.tools.map((tool) => {
                  const fromX = selectedNode.x + SESSION_GRAPH_CARD.width;
                  const fromY = selectedNode.y + 32;
                  const toX = tool.x + SESSION_GRAPH_TOOL_CARD.width / 2;
                  return (
                    <path
                      key={tool.name}
                      d={`M ${fromX} ${fromY} H ${graph.width - 12} V ${tool.y - 24} H ${toX} V ${
                        tool.y
                      }`}
                      stroke={euiTheme.colors.primary}
                      strokeOpacity="0.3"
                      strokeWidth="1.4"
                      strokeDasharray="4 5"
                      fill="none"
                    />
                  );
                })}
            </svg>
            <div css={laneLabel} style={{ left: graph.owner.x, top: 20 }}>
              {cloud
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.graphRequester',
                    { defaultMessage: 'Requester' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.ownerLabel',
                    { defaultMessage: 'Local owner' }
                  )}
            </div>
            <div css={laneLabel} style={{ left: graph.installation.x, top: 20 }}>
              {cloud
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.graphRuntime',
                    { defaultMessage: 'Cloud Run service' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.installationLabel',
                    { defaultMessage: 'Installation' }
                  )}
            </div>
            <div css={laneLabel} style={{ left: 370, top: 20 }}>
              {externalAgentGrouping(selected.provider, true)}
            </div>
            <div
              css={css`
                position: absolute;
              `}
              style={{ left: graph.owner.x, top: graph.owner.y, width: 138, height: 64 }}
            >
              <EuiToolTip
                display="block"
                content={
                  cloud
                    ? `${cloud.requester.email} · ${cloud.requester.provenance}`
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.ownerProvenance',
                        {
                          defaultMessage:
                            'Local OS account ownership. This does not establish who initiated each session.',
                        }
                      )
                }
              >
                <div css={card} style={{ height: 64 }} tabIndex={0}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type="user"
                        size="l"
                        color={owner || cloud ? 'primary' : 'subdued'}
                        aria-hidden={true}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem
                      css={css`
                        min-width: 0;
                      `}
                    >
                      <EuiText size="s" css={clipped}>
                        <strong>
                          {cloud?.requester.email ??
                            owner?.name ??
                            i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.ownerUnknown',
                              { defaultMessage: 'Not recorded' }
                            )}
                        </strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {cloud
                          ? i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.authenticated',
                              { defaultMessage: 'Authenticated' }
                            )
                          : i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.ownerScope',
                              { defaultMessage: 'Local account' }
                            )}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              </EuiToolTip>
            </div>
            <div
              css={[
                card,
                css`
                  position: absolute;
                `,
              ]}
              style={{
                left: graph.installation.x,
                top: graph.installation.y,
                width: 150,
                height: 64,
              }}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ProviderIcon provider={selected.provider ?? 'codex'} size={28} />
                </EuiFlexItem>
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText size="s">
                    <strong>{externalAgentLabel(selected.provider)}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued" css={clipped} title={cloud?.runtime.email}>
                    {cloud?.service_name ?? shortId(selected.agentId)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            {graph.sessions
              .filter((node) => node.group === 'selected_tree')
              .map((node) => (
                <div
                  key={node.key}
                  css={css`
                    position: absolute;
                  `}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: SESSION_GRAPH_CARD.width,
                    height: SESSION_GRAPH_CARD.height,
                  }}
                >
                  {node.selected && securityCount > 0 && (
                    <EuiBadge
                      color={securityColor}
                      iconType="shield"
                      title={securityLabel}
                      data-test-subj="codexGraphSecurityBadge"
                      css={css`
                        position: absolute;
                        right: ${euiTheme.size.s};
                        top: -${euiTheme.size.m};
                        z-index: 1;
                      `}
                    >
                      {invocationFindings.length === findings.length
                        ? i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.flaggedCallBadge',
                            {
                              defaultMessage:
                                '{count, plural, one {# flagged call} other {# flagged calls}}',
                              values: { count: invocationNodes.length },
                            }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.findingBadge',
                            {
                              defaultMessage: '{count, number} findings',
                              values: { count: securityCount },
                            }
                          )}
                    </EuiBadge>
                  )}
                  <EuiToolTip
                    display="block"
                    content={
                      <>
                        <strong>{node.session.id}</strong>
                        <br />
                        {parentDescription(node)}
                      </>
                    }
                  >
                    <button
                      type="button"
                      data-test-subj={
                        node.selected ? 'codexGraphSelectedSession' : 'codexGraphSession'
                      }
                      aria-current={node.selected ? 'true' : undefined}
                      aria-label={openSessionLabel(node.session)}
                      onClick={() => onSelectSession(node.session)}
                      css={[
                        card,
                        clickable,
                        node.selected &&
                          css`
                            border: 2px solid
                              ${securityCount > 0
                                ? euiTheme.colors[securityColor]
                                : euiTheme.colors.primary};
                            background: ${euiTheme.colors.emptyShade};
                            box-shadow: 0 0 0 4px ${transparentize(euiTheme.colors.primary, 0.08)};
                          `,
                        node.group === 'other' &&
                          css`
                            border-style: dashed;
                          `,
                      ]}
                      style={{ height: SESSION_GRAPH_CARD.height }}
                    >
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon
                            type={
                              node.session.role === 'guardian_review'
                                ? 'inspect'
                                : node.session.parentId
                                ? 'branch'
                                : 'consoleApp'
                            }
                            aria-hidden={true}
                            size="l"
                            color={node.selected ? 'primary' : 'subdued'}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem
                          css={css`
                            min-width: 0;
                          `}
                        >
                          <EuiText size="s" css={clipped}>
                            <strong>{sessionLabel(node.session)}</strong>
                          </EuiText>
                          <EuiText size="xs" color="subdued" css={clipped}>
                            {sessionSubtitle(node.session)}
                          </EuiText>
                        </EuiFlexItem>
                        {['missing', 'outside_view', 'cycle'].includes(node.parentState) && (
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="question" color="subdued" aria-hidden={true} />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </button>
                  </EuiToolTip>
                </div>
              ))}
            {graph.tools.length > 0 && (
              <div css={laneLabel} style={{ left: 180, top: graph.toolLaneY - 46 }}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.toolsLabel',
                  { defaultMessage: 'All session activity · tool totals' }
                )}
                {graph.omittedTools > 0 && ` +${graph.omittedTools}`}
              </div>
            )}
            {graph.tools.map((tool) => (
              <div
                key={tool.name}
                css={css`
                  position: absolute;
                `}
                style={{
                  left: tool.x,
                  top: tool.y,
                  width: SESSION_GRAPH_TOOL_CARD.width,
                  height: SESSION_GRAPH_TOOL_CARD.height,
                }}
              >
                <EuiToolTip
                  display="block"
                  content={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.toolOutcomes',
                    {
                      defaultMessage:
                        '{tool}: {count, number} observations; {success, number} successes, {failure, number} failures, {unknown, number} unknown outcomes.',
                      values: {
                        tool: tool.name,
                        count: tool.count,
                        success: tool.success_count,
                        failure: tool.failure_count,
                        unknown: tool.unknown_count,
                      },
                    }
                  )}
                >
                  <button
                    type="button"
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.filterTool',
                      { defaultMessage: 'Filter tool {tool}', values: { tool: tool.name } }
                    )}
                    onClick={() => onSelectTool(tool.name)}
                    css={[card, clickable]}
                    style={{ height: SESSION_GRAPH_TOOL_CARD.height }}
                  >
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type={toolIcon(tool.name)} color="primary" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem
                        css={css`
                          min-width: 0;
                        `}
                      >
                        <EuiText size="xs" css={clipped}>
                          <strong>{tool.name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="s"
                      responsive={false}
                      css={css`
                        margin-top: 7px;
                      `}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>{tool.count.toLocaleString()}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <div
                          aria-hidden="true"
                          css={css`
                            display: flex;
                            height: 6px;
                            gap: 1px;
                            overflow: hidden;
                            border-radius: 3px;
                            background: ${euiTheme.colors.lightShade};
                          `}
                        >
                          {[
                            { count: tool.success_count, color: euiTheme.colors.success },
                            { count: tool.failure_count, color: euiTheme.colors.danger },
                            { count: tool.unknown_count, color: euiTheme.colors.mediumShade },
                          ]
                            .filter(({ count }) => count > 0)
                            .map(({ count, color }) => (
                              <span key={color} style={{ flex: count, backgroundColor: color }} />
                            ))}
                        </div>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </button>
                </EuiToolTip>
              </div>
            ))}
            {security && selectedNode && (
              <SecurityGraphNodes
                scope={security.scope}
                result={{ ...security.result, findings: invocationFindings }}
                invocations
                events={sessionEvents}
                onInspectEvent={onInspectEvent}
                contextKey={contextKey}
                source={{
                  x: selectedNode.x + SESSION_GRAPH_CARD.width / 2,
                  y: selectedNode.y + SESSION_GRAPH_CARD.height,
                }}
                left={180}
                top={securityTop}
                width={graph.width}
                height={graph.height}
              />
            )}
          </div>
        </div>
        {security && (
          <div
            css={css`
              margin-top: ${euiTheme.size.m};
            `}
          >
            <SessionSecurityRemainder findings={sessionFindings} contextKey={contextKey} />
            <SessionSecurityRemainder
              findings={unloadedFindings}
              contextKey={contextKey}
              attributed
            />
          </div>
        )}
        {graph.otherSessionCount > 0 && (
          <div
            css={css`
              margin-top: ${euiTheme.size.s};
            `}
          >
            <EuiButtonEmpty
              size="s"
              flush="left"
              iconType={includeOtherSessions ? 'chevronSingleDown' : 'chevronSingleRight'}
              aria-expanded={includeOtherSessions}
              onClick={() => setIncludeOtherSessions((value) => !value)}
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.otherSessions',
                {
                  defaultMessage: 'Other {grouping} ({count, number})',
                  values: {
                    count: graph.otherSessionCount,
                    grouping: externalAgentGroupsInSentence(selected.provider),
                  },
                }
              )}
            </EuiButtonEmpty>
            {includeOtherSessions && (
              <>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.graph.otherLabel',
                    {
                      defaultMessage: 'Other {grouping} · no recorded connection to this tree',
                      values: { grouping: externalAgentGroupsInSentence(selected.provider) },
                    }
                  )}
                </EuiText>
                <EuiFlexGroup
                  gutterSize="s"
                  wrap
                  css={css`
                    margin-top: ${euiTheme.size.s};
                  `}
                >
                  {graph.sessions
                    .filter((node) => node.group === 'other')
                    .map((node) => (
                      <EuiFlexItem grow={false} key={node.key}>
                        <button
                          type="button"
                          aria-label={openSessionLabel(node.session)}
                          onClick={() => onSelectSession(node.session)}
                          css={[
                            card,
                            clickable,
                            css`
                              width: 184px;
                              border-style: dashed;
                            `,
                          ]}
                        >
                          <EuiText size="s" css={clipped}>
                            <strong>{sessionLabel(node.session)}</strong>
                          </EuiText>
                          <EuiText size="xs" color="subdued" css={clipped}>
                            {sessionSubtitle(node.session)}
                          </EuiText>
                        </button>
                      </EuiFlexItem>
                    ))}
                </EuiFlexGroup>
              </>
            )}
          </div>
        )}
      </>
      {cloud && (
        <div
          css={css`
            margin-top: ${euiTheme.size.l};
          `}
        >
          <GoogleAdkContextPanel
            context={cloud}
            events={sessionEvents}
            onInspectEvent={onInspectEvent}
          />
        </div>
      )}
    </section>
  );
};
