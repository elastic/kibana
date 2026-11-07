/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import type { IntelligenceEntity } from './common';
import type { EntityStoreStats } from './hooks/use_entity_store_stats';
import { IntelligencePanel, RiskLevelBadge } from './components';
import { OverviewFindings } from './overview_findings';
import { useCodexSessions } from './ai_agents/use_codex_sessions';
import { useAgentInventory } from './ai_agents/use_agent_inventory';
import { ProviderIcon } from './ai_agents/provider_icon';
import { externalAgentLabel, externalAgentGrouping } from './ai_agents/external_agent_provider';
import type { ExternalAgentProvider } from './ai_agents/external_agent_provider';
import { getCodexSessionTitle } from './ai_agents/codex_model';
import type { CodexSession } from './ai_agents/codex_types';
import { AgentTimestamp } from './ai_agents/agent_evidence';
import { behaviorLabels } from './ai_agents/behavior_presentation';
import { summarizeOverviewSessions } from './overview_operations_model';
import type { OverviewExternalSummary } from './overview_operations_model';

interface ExternalSourceCard {
  provider: ExternalAgentProvider;
  summary: OverviewExternalSummary;
  loading: boolean;
  unavailable: boolean;
  partial: boolean;
  onInvestigate?: (key: string) => void;
}

const sessionKey = (session: CodexSession): string => JSON.stringify([session.agentId, session.id]);

const SessionOutcomeBar: React.FC<{ session: CodexSession }> = ({ session }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden="true"
      css={css`
        display: flex;
        height: 5px;
        overflow: hidden;
        border-radius: 3px;
        background: ${euiTheme.colors.lightShade};
      `}
    >
      {[
        { count: session.successes, color: euiTheme.colors.success },
        { count: session.failures, color: euiTheme.colors.danger },
        { count: session.unknowns, color: euiTheme.colors.mediumShade },
      ].map(({ count, color }) => (
        <span
          key={color}
          style={{
            width: `${session.toolCount ? (count / session.toolCount) * 100 : 0}%`,
            background: color,
          }}
        />
      ))}
    </div>
  );
};

export const OverviewOperations: React.FC<{
  stats?: EntityStoreStats;
  entities: IntelligenceEntity[];
  entitiesLoading: boolean;
  entitiesUnavailable: boolean;
  onInvestigateEntity: (entity: IntelligenceEntity) => void;
  onViewAllEntities: () => void;
  onGenerateBrief?: () => void;
  onInvestigateAgent?: (id: string) => void;
  onInvestigateCodex?: (key: string) => void;
  onInvestigateCursor?: (key: string) => void;
  onInvestigateClaudeDesktop?: (key: string) => void;
  onInvestigateGoogleAdk?: (key: string) => void;
}> = ({
  stats,
  entities,
  entitiesLoading,
  entitiesUnavailable,
  onInvestigateEntity,
  onViewAllEntities,
  onGenerateBrief,
  onInvestigateAgent,
  onInvestigateCodex,
  onInvestigateCursor,
  onInvestigateClaudeDesktop,
  onInvestigateGoogleAdk,
}) => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const codex = useCodexSessions(spaceId, 'codex');
  const cursor = useCodexSessions(spaceId, 'cursor');
  const claudeDesktop = useCodexSessions(spaceId, 'claude_desktop');
  const googleAdk = useCodexSessions(spaceId, 'google_adk');
  const builder = useAgentInventory(spaceId);
  const codexSummary = useMemo(
    () => summarizeOverviewSessions(codex.unavailable ? [] : codex.sessions),
    [codex.sessions, codex.unavailable]
  );
  const cursorSummary = useMemo(
    () => summarizeOverviewSessions(cursor.unavailable ? [] : cursor.sessions),
    [cursor.sessions, cursor.unavailable]
  );
  const claudeDesktopSummary = useMemo(
    () => summarizeOverviewSessions(claudeDesktop.unavailable ? [] : claudeDesktop.sessions),
    [claudeDesktop.sessions, claudeDesktop.unavailable]
  );
  const googleAdkSummary = useMemo(
    () => summarizeOverviewSessions(googleAdk.unavailable ? [] : googleAdk.sessions),
    [googleAdk.sessions, googleAdk.unavailable]
  );
  const sources: ExternalSourceCard[] = [
    {
      provider: 'codex',
      summary: codexSummary,
      loading: codex.isLoading,
      unavailable: codex.unavailable,
      partial: codex.partial,
      onInvestigate: onInvestigateCodex,
    },
    {
      provider: 'cursor',
      summary: cursorSummary,
      loading: cursor.isLoading,
      unavailable: cursor.unavailable,
      partial: cursor.partial,
      onInvestigate: onInvestigateCursor,
    },
    {
      provider: 'claude_desktop',
      summary: claudeDesktopSummary,
      loading: claudeDesktop.isLoading,
      unavailable: claudeDesktop.unavailable,
      partial: claudeDesktop.partial,
      onInvestigate: onInvestigateClaudeDesktop,
    },
    {
      provider: 'google_adk',
      summary: googleAdkSummary,
      loading: googleAdk.isLoading,
      unavailable: googleAdk.unavailable,
      partial: googleAdk.partial,
      onInvestigate: onInvestigateGoogleAdk,
    },
  ];
  const definitionsAvailable = builder.definitionsStatus !== 'unavailable';
  const builderAgents = definitionsAvailable ? builder.agents : [];
  const recentBuilder = [...builderAgents].sort(
    (left, right) =>
      Date.parse(right.activity?.lastSeen ?? '1970-01-01') -
      Date.parse(left.activity?.lastSeen ?? '1970-01-01')
  )[0];
  const agentCount =
    builderAgents.length +
    codexSummary.installations +
    cursorSummary.installations +
    claudeDesktopSummary.installations +
    googleAdkSummary.installations;
  const loading =
    entitiesLoading ||
    codex.isLoading ||
    cursor.isLoading ||
    claudeDesktop.isLoading ||
    googleAdk.isLoading ||
    builder.isLoading;
  const partial =
    entitiesUnavailable ||
    codex.unavailable ||
    cursor.unavailable ||
    codex.partial ||
    cursor.partial ||
    claudeDesktop.unavailable ||
    googleAdk.unavailable ||
    claudeDesktop.partial ||
    googleAdk.partial ||
    !definitionsAvailable;
  const evaluated =
    codexSummary.evaluatedSessions +
    cursorSummary.evaluatedSessions +
    claudeDesktopSummary.evaluatedSessions +
    googleAdkSummary.evaluatedSessions;
  const changes =
    codexSummary.changedSessions +
    cursorSummary.changedSessions +
    claudeDesktopSummary.changedSessions +
    googleAdkSummary.changedSessions;
  const highRisk = entities
    .filter((entity) => entity.riskLevel === 'High' || entity.riskLevel === 'Critical')
    .sort(
      (left, right) =>
        Number(right.riskLevel === 'Critical') - Number(left.riskLevel === 'Critical') ||
        (right.riskScoreNorm ?? 0) - (left.riskScoreNorm ?? 0)
    )
    .slice(0, 3);
  const signals = sources
    .flatMap((source) =>
      source.summary.signals.slice(0, 2).map((signal) => ({ ...signal, source }))
    )
    .slice(0, 3);
  const recentSessions = sources
    .flatMap((source) => source.summary.recentSessions.map((session) => ({ session, source })))
    .sort((left, right) => Date.parse(right.session.lastSeen) - Date.parse(left.session.lastSeen))
    .slice(0, 4);
  const recentGridStyle = css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${euiTheme.size.m};
    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  `;
  const rowStyle = css`
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
    gap: ${euiTheme.size.m};
    @media (max-width: 850px) {
      grid-template-columns: 1fr;
    }
  `;
  const entryStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.m} 0;
    border-bottom: ${euiTheme.border.thin};
    &:last-child {
      border-bottom: 0;
    }
  `;
  const ellipsisStyle = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const metricCards = [
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.operations.identityCount',
        { defaultMessage: 'Identities observed' }
      ),
      value: `${partial ? '≥ ' : ''}${((stats?.totalEntities ?? 0) + agentCount).toLocaleString()}`,
      icon: 'users',
      detail: stats
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.operations.identityDetail',
            {
              defaultMessage:
                '{entities, number} users, hosts & services · {agents, number} agents',
              values: { entities: stats.totalEntities, agents: agentCount },
            }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.operations.entityTotalsUnavailable',
            {
              defaultMessage: 'Entity totals unavailable · {agents, number} agents observed',
              values: { agents: agentCount },
            }
          ),
      color: euiTheme.colors.primary,
    },
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.operations.riskCount',
        { defaultMessage: 'High / critical risk' }
      ),
      value: stats ? (stats.highCount + stats.criticalCount).toLocaleString() : '—',
      icon: 'shield',
      detail: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.operations.riskDetail',
        { defaultMessage: 'Entity risk engine · scored identities' }
      ),
      color: euiTheme.colors.danger,
    },
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.operations.sessionsCount',
        { defaultMessage: 'Sessions, runs & connections' }
      ),
      value: `${sources.some((source) => source.partial || source.unavailable) ? '≥ ' : ''}${(
        codexSummary.sessions +
        cursorSummary.sessions +
        claudeDesktopSummary.sessions +
        googleAdkSummary.sessions
      ).toLocaleString()}`,
      icon: 'graphApp',
      detail: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.operations.sessionsDetail',
        {
          defaultMessage: '{count, number} accumulated tool observations',
          values: {
            count:
              codexSummary.observations +
              cursorSummary.observations +
              claudeDesktopSummary.observations +
              googleAdkSummary.observations,
          },
        }
      ),
      color: euiTheme.colors.accent,
    },
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.operations.changedCount',
        { defaultMessage: 'Sessions with behavior changes' }
      ),
      value: evaluated ? changes.toLocaleString() : '—',
      icon: 'chartAnomaly',
      detail: evaluated
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.operations.changedDetail',
            {
              defaultMessage:
                '{count, plural, one {# session had a comparable baseline} other {# sessions had a comparable baseline}}',
              values: { count: evaluated },
            }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.operations.awaitingBaseline',
            { defaultMessage: 'Waiting for comparable history' }
          ),
      color: changes ? euiTheme.colors.warning : euiTheme.colors.primary,
    },
  ];
  return (
    <section data-test-subj="entityIntelligenceOperations">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.title',
                { defaultMessage: 'Identity overview' }
              )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="users" onClick={onViewAllEntities}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.operations.browse',
              { defaultMessage: 'All identities' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {onGenerateBrief && (
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="sparkles" onClick={onGenerateBrief}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.generateBriefButtonLabel',
                { defaultMessage: 'Generate executive brief' }
              )}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          padding: 0;
          gap: ${euiTheme.size.m};
          @media (max-width: 900px) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        `}
      >
        {metricCards.map((card) => (
          <div
            key={card.label}
            css={css`
              min-width: 0;
              position: relative;
              padding: ${euiTheme.size.m} ${euiTheme.size.base};
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
              background: linear-gradient(
                135deg,
                ${transparentize(card.color, 0.07)},
                ${euiTheme.colors.emptyShade} 65%
              );
              border-top: 2px solid ${card.color};
            `}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={card.icon} color={card.color} aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {card.label}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            {loading ? (
              <EuiSkeletonText lines={1} />
            ) : (
              <EuiTitle size="m">
                <div>{card.value}</div>
              </EuiTitle>
            )}
            <EuiText size="xs" color="subdued">
              <p>{card.detail}</p>
            </EuiText>
          </div>
        ))}
      </div>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.operations.snapshotLimit',
          {
            defaultMessage:
              'Snapshot: latest 200 sessions or MCP connections per external source, seen in 30 days. Source activity shows collection limits and counting units.',
          }
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <div css={rowStyle}>
        <OverviewFindings
          scope={{ type: 'all' }}
          entityTargets={entities}
          onInvestigateAgent={({ provider, id, sessionId }) => {
            if (provider === 'agent_builder') {
              onInvestigateAgent?.(id);
            } else if (sessionId) {
              const key = JSON.stringify([id, sessionId]);
              if (provider === 'codex') onInvestigateCodex?.(key);
              else if (provider === 'google_adk') onInvestigateGoogleAdk?.(key);
              else if (provider === 'claude_desktop') onInvestigateClaudeDesktop?.(key);
              else onInvestigateCursor?.(key);
            }
          }}
          onInvestigateEntity={(entityId) => {
            const entity = entities.find((candidate) => candidate.id === entityId);
            if (entity) onInvestigateEntity(entity);
          }}
        />
        <IntelligencePanel>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.agentActivity',
                { defaultMessage: 'Agent activity' }
              )}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.activityWindow',
                { defaultMessage: 'Sessions and invocations seen in the last 30 days' }
              )}
            </p>
          </EuiText>
          {sources.map((source) => (
            <div key={source.provider} css={entryStyle}>
              <ProviderIcon provider={source.provider} size={32} />
              <div
                css={css`
                  flex: 1;
                  min-width: 0;
                `}
              >
                <EuiText size="s">
                  <strong>{externalAgentLabel(source.provider)}</strong>
                </EuiText>
                {source.loading ? (
                  <EuiSkeletonText lines={1} />
                ) : (
                  <EuiText size="xs" color="subdued">
                    {source.unavailable
                      ? i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.operations.sourceUnavailable',
                          { defaultMessage: 'Source unavailable' }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.operations.sourceCounts',
                          {
                            defaultMessage:
                              '{sessions, number} {grouping} · {calls, number} tool observations',
                            values: {
                              sessions: source.summary.sessions,
                              grouping: externalAgentGrouping(source.provider, true),
                              calls: source.summary.observations,
                            },
                          }
                        )}
                  </EuiText>
                )}
                {!source.loading && source.partial && (
                  <EuiBadge color="warning">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.partial',
                      { defaultMessage: 'Partial snapshot' }
                    )}
                  </EuiBadge>
                )}
              </div>
              <EuiButtonEmpty
                size="xs"
                iconType="chevronSingleRight"
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.operations.openProvider',
                  {
                    defaultMessage: 'Explore {provider}',
                    values: { provider: externalAgentLabel(source.provider) },
                  }
                )}
                disabled={!source.onInvestigate || !source.summary.recentSessions.length}
                onClick={() => {
                  const session = source.summary.recentSessions[0];
                  if (session) source.onInvestigate?.(sessionKey(session));
                }}
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.operations.explore',
                  { defaultMessage: 'Explore' }
                )}
              </EuiButtonEmpty>
            </div>
          ))}
          <div css={entryStyle}>
            <ProviderIcon provider="elastic" size={32} />
            <div
              css={css`
                flex: 1;
                min-width: 0;
              `}
            >
              <EuiText size="s">
                <strong>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.operations.builder',
                    { defaultMessage: 'Agent Builder' }
                  )}
                </strong>
              </EuiText>
              {builder.isLoading ? (
                <EuiSkeletonText lines={1} />
              ) : (
                <EuiText size="xs" color="subdued">
                  {!definitionsAvailable
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.operations.sourceUnavailable',
                        { defaultMessage: 'Source unavailable' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.operations.builderCounts',
                        {
                          defaultMessage: '{agents, number} agents · {invocations} invocations',
                          values: {
                            agents: builderAgents.length,
                            invocations:
                              builder.activityStatus === 'unavailable' ||
                              builder.activityStatus === 'partial'
                                ? '—'
                                : builderAgents
                                    .reduce(
                                      (total, agent) => total + (agent.activity?.invocations ?? 0),
                                      0
                                    )
                                    .toLocaleString(),
                          },
                        }
                      )}
                </EuiText>
              )}
            </div>
            <EuiButtonEmpty
              size="xs"
              iconType="chevronSingleRight"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.openBuilder',
                { defaultMessage: 'Explore Agent Builder' }
              )}
              disabled={!recentBuilder || !onInvestigateAgent}
              onClick={() => {
                if (recentBuilder) onInvestigateAgent?.(recentBuilder.id);
              }}
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.explore',
                { defaultMessage: 'Explore' }
              )}
            </EuiButtonEmpty>
          </div>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              <EuiIconTip
                type="info"
                content={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.operations.coverageDetail',
                  {
                    defaultMessage:
                      'External session and MCP connection snapshots are limited to the latest 200 per source seen in 30 days. Their tool counts include all accumulated observations, which can predate that window and include both model calls and native completions. Claude Desktop groups tool activity by MCP connection, which can span multiple chats. Agent Builder counts invocations; these are different units.',
                  }
                )}
              />{' '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.coverageCaption',
                { defaultMessage: 'Source coverage and units matter' }
              )}
            </p>
          </EuiText>
        </IntelligencePanel>
      </div>
      <EuiSpacer size="m" />
      <div css={recentSessions.length ? rowStyle : undefined}>
        <IntelligencePanel>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.attention',
                { defaultMessage: 'Risk & behavior context' }
              )}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.operations.attentionDetail',
                {
                  defaultMessage: 'Risk and behavioral evidence, with a direct path to the source.',
                }
              )}
            </p>
          </EuiText>
          {loading ? (
            <EuiSkeletonText lines={4} />
          ) : (
            <>
              {highRisk.map((entity) => (
                <div key={entity.id} css={entryStyle}>
                  <EuiIcon
                    type={
                      entity.type === 'user'
                        ? 'user'
                        : entity.type === 'host'
                        ? 'storage'
                        : 'vectorTriangle'
                    }
                    color="danger"
                    size="l"
                    aria-hidden={true}
                  />
                  <div
                    css={css`
                      flex: 1;
                      min-width: 0;
                    `}
                  >
                    <EuiText size="s" css={ellipsisStyle}>
                      <strong title={entity.name}>{entity.name}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.operations.entityRisk',
                        { defaultMessage: 'Entity risk · {type}', values: { type: entity.type } }
                      )}
                    </EuiText>
                  </div>
                  <RiskLevelBadge level={entity.riskLevel} score={entity.riskScoreNorm} />
                  <EuiButtonEmpty
                    size="xs"
                    iconType="inspect"
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.investigateEntity',
                      { defaultMessage: 'Investigate {name}', values: { name: entity.name } }
                    )}
                    onClick={() => onInvestigateEntity(entity)}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.open',
                      { defaultMessage: 'Open' }
                    )}
                  </EuiButtonEmpty>
                </div>
              ))}
              {signals.map(({ session, findings, source }) => (
                <div key={`${source.provider}:${sessionKey(session)}`} css={entryStyle}>
                  <ProviderIcon provider={source.provider} size={24} />
                  <div
                    css={css`
                      flex: 1;
                      min-width: 0;
                    `}
                  >
                    <EuiText size="s" css={ellipsisStyle}>
                      <strong title={getCodexSessionTitle(session)}>
                        {getCodexSessionTitle(session)}
                      </strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {behaviorLabels[findings[0].kind]}
                      {findings[0].toolName ? ` · ${findings[0].toolName}` : ''}
                    </EuiText>
                  </div>
                  <EuiBadge color="warning">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.signalCount',
                      {
                        defaultMessage: '{count, number} signals',
                        values: { count: findings.length },
                      }
                    )}
                  </EuiBadge>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="inspect"
                    disabled={!source.onInvestigate}
                    onClick={() => source.onInvestigate?.(sessionKey(session))}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.investigateSession',
                      {
                        defaultMessage: 'Investigate session {title}',
                        values: { title: getCodexSessionTitle(session) },
                      }
                    )}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.open',
                      { defaultMessage: 'Open' }
                    )}
                  </EuiButtonEmpty>
                </div>
              ))}
              {!highRisk.length && !signals.length && (
                <>
                  <EuiSpacer size="l" />
                  <EuiText size="s" color="subdued">
                    <p>
                      {partial || !evaluated
                        ? i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.operations.incompleteAttention',
                            {
                              defaultMessage:
                                'No items in the available evidence. Some sources or comparison baselines are incomplete.',
                            }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.operations.noAttention',
                            {
                              defaultMessage:
                                'No high-risk entities or detected session changes in this snapshot.',
                            }
                          )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="l" />
                </>
              )}
            </>
          )}
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.operations.signalScope',
              {
                defaultMessage:
                  'Session changes use matched installation, model and role. Review sessions are excluded; repeated failures are checked when you open a session.',
              }
            )}
          </EuiText>
        </IntelligencePanel>
        {recentSessions.length > 0 && (
          <IntelligencePanel>
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.operations.recentSessions',
                  { defaultMessage: 'Recent activity' }
                )}
              </h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.operations.recentSessionsDetail',
                  {
                    defaultMessage:
                      'Return to the prompts, tools and identities behind the latest activity.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <div css={recentGridStyle}>
              {recentSessions.map(({ session, source }) => (
                <button
                  key={`${source.provider}:${sessionKey(session)}`}
                  type="button"
                  disabled={!source.onInvestigate}
                  onClick={() => source.onInvestigate?.(sessionKey(session))}
                  css={css`
                    text-align: left;
                    color: ${euiTheme.colors.textParagraph};
                    background: ${euiTheme.colors.emptyShade};
                    border: ${euiTheme.border.thin};
                    border-radius: ${euiTheme.border.radius.medium};
                    padding: ${euiTheme.size.m};
                    min-width: 0;
                    cursor: pointer;
                    &:hover {
                      border-color: ${euiTheme.colors.primary};
                      background: ${transparentize(euiTheme.colors.primary, 0.04)};
                    }
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                    }
                  `}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <ProviderIcon provider={source.provider} size={22} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="xs" color="subdued">
                        {externalAgentLabel(source.provider)}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="chevronSingleRight" aria-hidden={true} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <div
                    title={getCodexSessionTitle(session)}
                    css={css`
                      font-weight: ${euiTheme.font.weight.semiBold};
                      font-size: ${euiTheme.size.m};
                      line-height: 1.5;
                      height: 3em;
                      overflow: hidden;
                      display: -webkit-box;
                      -webkit-line-clamp: 2;
                      -webkit-box-orient: vertical;
                    `}
                  >
                    {getCodexSessionTitle(session)}
                  </div>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    <p>
                      {session.googleAdk?.requester
                        ? i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.operations.requester',
                            {
                              defaultMessage: 'Requester: {requester}',
                              values: { requester: session.googleAdk.requester.email },
                            }
                          )
                        : session.owner
                        ? i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.operations.localOwner',
                            {
                              defaultMessage: 'Local owner: {owner}',
                              values: { owner: session.owner.name },
                            }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.operations.ownerNotRecorded',
                            { defaultMessage: 'Owner not recorded' }
                          )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <SessionOutcomeBar session={session} />
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.operations.sessionCounts',
                      {
                        defaultMessage: '{calls, number} observations · {failures, number} failed',
                        values: { calls: session.toolCount, failures: session.failures },
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    <AgentTimestamp value={session.lastSeen} />
                  </EuiText>
                </button>
              ))}
            </div>
          </IntelligencePanel>
        )}
      </div>
    </section>
  );
};
