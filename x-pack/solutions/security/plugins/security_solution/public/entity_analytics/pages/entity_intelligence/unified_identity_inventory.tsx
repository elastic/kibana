/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { getRiskLevelColor } from './common';
import type { IntelligenceEntity } from './common';
import { useIntelligenceEntityList } from './hooks/use_intelligence_entity_list';
import { useAgentInventory } from './ai_agents/use_agent_inventory';
import { useCodexSessions } from './ai_agents/use_codex_sessions';
import { ProviderIcon } from './ai_agents/provider_icon';
import {
  buildUnifiedIdentityRows,
  filterUnifiedIdentityRows,
} from './unified_identity_inventory_model';
import type {
  IdentityKind,
  IdentitySource,
  UnifiedIdentityRow,
} from './unified_identity_inventory_model';

const ENTITY_LIMIT = 500;
const labels = {
  all: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.all', {
    defaultMessage: 'All',
  }),
  user: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.users', {
    defaultMessage: 'Users',
  }),
  host: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.hosts', {
    defaultMessage: 'Hosts',
  }),
  service: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.services', {
    defaultMessage: 'Services',
  }),
  ai_agent: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.agents', {
    defaultMessage: 'AI agents',
  }),
  generic: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.other', {
    defaultMessage: 'Other',
  }),
};
const kindLabels: Record<IdentityKind, string> = {
  user: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.user', {
    defaultMessage: 'User',
  }),
  host: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.host', {
    defaultMessage: 'Host',
  }),
  service: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.service', {
    defaultMessage: 'Service',
  }),
  ai_agent: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.agent', {
    defaultMessage: 'AI agent',
  }),
  generic: labels.generic,
};
const sourceLabels: Record<IdentitySource, string> = {
  entity_store: 'Entity Store',
  agent_builder: 'Agent Builder',
  codex: 'Codex',
  cursor: 'Cursor',
  claude_desktop: 'Claude Desktop',
  google_adk: 'Google ADK',
};
const kindIcons: Record<IdentityKind, string> = {
  user: 'user',
  host: 'storage',
  service: 'gear',
  generic: 'index',
  ai_agent: 'sparkles',
};
const filterKinds: Array<IdentityKind | 'all'> = ['all', 'user', 'host', 'service', 'ai_agent'];

export interface UnifiedIdentityInventoryProps {
  onInvestigateEntity: (entity: IntelligenceEntity) => void;
  onInvestigateAgent: (agentId: string) => void;
  onInvestigateCodex: (sessionKey: string) => void;
  onInvestigateCursor: (sessionKey: string) => void;
  onInvestigateClaudeDesktop?: (sessionKey: string) => void;
  onInvestigateGoogleAdk?: (sessionKey: string) => void;
}

export const UnifiedIdentityInventory: React.FC<UnifiedIdentityInventoryProps> = ({
  onInvestigateEntity,
  onInvestigateAgent,
  onInvestigateCodex,
  onInvestigateCursor,
  onInvestigateClaudeDesktop,
  onInvestigateGoogleAdk,
}) => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const entitySource = useIntelligenceEntityList({
    perPage: ENTITY_LIMIT,
    enabled: Boolean(spaceId),
  });
  const agentSource = useAgentInventory(spaceId);
  const codexSource = useCodexSessions(spaceId);
  const cursorSource = useCodexSessions(spaceId, 'cursor');
  const claudeDesktopSource = useCodexSessions(spaceId, 'claude_desktop');
  const googleAdkSource = useCodexSessions(spaceId, 'google_adk');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<IdentityKind | 'all'>('all');
  const entityUnavailable = !spaceId || entitySource.isError;
  const agentUnavailable =
    !spaceId ||
    agentSource.definitionsStatus === 'unavailable' ||
    agentSource.status === 'unavailable';
  const codexUnavailable = !spaceId || codexSource.unavailable;
  const cursorUnavailable = !spaceId || cursorSource.unavailable;
  const claudeDesktopUnavailable = !spaceId || claudeDesktopSource.unavailable;
  const claudeDesktopPartial =
    !claudeDesktopUnavailable &&
    (claudeDesktopSource.partial ||
      (claudeDesktopSource.total ?? 0) > claudeDesktopSource.sessions.length);
  const googleAdkUnavailable = !spaceId || googleAdkSource.unavailable;
  const googleAdkPartial =
    !googleAdkUnavailable &&
    (googleAdkSource.partial || (googleAdkSource.total ?? 0) > googleAdkSource.sessions.length);
  const cursorPartial =
    !cursorUnavailable &&
    (cursorSource.partial || (cursorSource.total ?? 0) > cursorSource.sessions.length);
  const codexPartial =
    !codexUnavailable &&
    (codexSource.partial || (codexSource.total ?? 0) > codexSource.sessions.length);
  const entityPartial = !entityUnavailable && entitySource.total > entitySource.entities.length;
  const rows = useMemo(
    () =>
      buildUnifiedIdentityRows({
        entities: entityUnavailable ? [] : entitySource.entities,
        agents: agentUnavailable ? [] : agentSource.agents,
        codexSessions: codexUnavailable ? [] : codexSource.sessions,
        codexPartial,
        cursorSessions: cursorUnavailable ? [] : cursorSource.sessions,
        cursorPartial,
        claudeDesktopSessions: claudeDesktopUnavailable ? [] : claudeDesktopSource.sessions,
        claudeDesktopPartial,
        googleAdkSessions: googleAdkUnavailable ? [] : googleAdkSource.sessions,
        googleAdkPartial,
        agentActivityPartial: agentSource.activityStatus === 'partial',
        agentActivityUnavailable: agentSource.activityStatus === 'unavailable',
      }),
    [
      entityUnavailable,
      agentUnavailable,
      codexUnavailable,
      entitySource.entities,
      agentSource.agents,
      agentSource.activityStatus,
      codexSource.sessions,
      codexPartial,
      cursorUnavailable,
      cursorSource.sessions,
      cursorPartial,
      claudeDesktopUnavailable,
      googleAdkUnavailable,
      claudeDesktopSource.sessions,
      googleAdkSource.sessions,
      claudeDesktopPartial,
      googleAdkPartial,
    ]
  );
  const filteredRows = useMemo(
    () => filterUnifiedIdentityRows(rows, query, kind),
    [rows, query, kind]
  );
  const isLoading =
    entitySource.isLoading ||
    agentSource.isLoading ||
    codexSource.isLoading ||
    cursorSource.isLoading ||
    claudeDesktopSource.isLoading ||
    googleAdkSource.isLoading;
  const isRefreshing =
    entitySource.isRefreshing ||
    agentSource.isRefreshing ||
    codexSource.isRefreshing ||
    cursorSource.isRefreshing ||
    claudeDesktopSource.isRefreshing ||
    googleAdkSource.isRefreshing;

  const investigate = (row: UnifiedIdentityRow) => {
    switch (row.target.source) {
      case 'entity_store':
        onInvestigateEntity(row.target.entity);
        break;
      case 'agent_builder':
        onInvestigateAgent(row.target.agentId);
        break;
      case 'codex':
        onInvestigateCodex(row.target.sessionKey);
        break;
      case 'claude_desktop':
        onInvestigateClaudeDesktop?.(row.target.sessionKey);
        break;
      case 'google_adk':
        onInvestigateGoogleAdk?.(row.target.sessionKey);
        break;
      case 'cursor':
        onInvestigateCursor(row.target.sessionKey);
        break;
    }
  };
  const unavailable = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.unified.unavailable',
    { defaultMessage: 'Unavailable' }
  );
  const unknown = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.unified.unknown',
    { defaultMessage: 'Not available' }
  );
  const columns: Array<EuiBasicTableColumn<UnifiedIdentityRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.identity', {
        defaultMessage: 'Identity',
      }),
      sortable: true,
      width: '240px',
      render: (_name: string, row: UnifiedIdentityRow) => (
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {row.source !== 'entity_store' ? (
              <ProviderIcon
                provider={row.source === 'agent_builder' ? 'elastic' : row.source}
                size={32}
              />
            ) : (
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${transparentize(euiTheme.colors.primary, 0.09)};
                `}
              >
                <EuiIcon type={kindIcons[row.kind]} color="primary" size="m" aria-hidden={true} />
              </span>
            )}
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 0;
            `}
          >
            <EuiToolTip content={row.identifier}>
              <EuiLink
                onClick={() => investigate(row)}
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {row.name}
              </EuiLink>
            </EuiToolTip>
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              <span>
                {sourceLabels[row.source]}
                {row.sourceDetail ? ` · ${row.sourceDetail}` : ''}
              </span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'kind',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.type', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      width: '100px',
      render: (value: IdentityKind) => <EuiBadge color="hollow">{kindLabels[value]}</EuiBadge>,
    },
    {
      field: 'owner',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.owner', {
        defaultMessage: 'Owner / creator',
      }),
      sortable: true,
      width: '140px',
      render: (owner: string | undefined, row: UnifiedIdentityRow) =>
        owner ? (
          <span
            title={
              row.source === 'google_adk'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.unified.declaredOwner',
                    {
                      defaultMessage:
                        'Declared owner; separate from requester and runtime identity',
                    }
                  )
                : undefined
            }
          >
            {owner}
          </span>
        ) : (
          <span title={unknown}>{'—'}</span>
        ),
    },
    {
      field: 'riskScore',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.risk', {
        defaultMessage: 'Risk',
      }),
      sortable: true,
      width: '120px',
      render: (score: number | undefined, row: UnifiedIdentityRow) =>
        score === undefined ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.unified.notScored',
              { defaultMessage: 'Not scored' }
            )}
          </EuiText>
        ) : (
          <EuiBadge color={getRiskLevelColor(euiTheme, row.riskLevel ?? 'Unknown')}>{`${Math.round(
            score
          )} · ${row.riskLevel ?? 'Unknown'}`}</EuiBadge>
        ),
    },
    {
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.activity', {
        defaultMessage: 'Activity · 30d',
      }),
      width: '150px',
      render: (row: UnifiedIdentityRow) =>
        row.activity ? (
          <span>
            {row.activity.unit === 'connections'
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.unified.connections',
                  {
                    defaultMessage: '{count} MCP connections',
                    values: { count: row.activity.count },
                  }
                )
              : row.activity.unit === 'runs'
              ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.runs', {
                  defaultMessage: '{count} runs',
                  values: { count: `${row.activity.count}${row.activity.partial ? '+' : ''}` },
                })
              : row.activity.unit === 'sessions'
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.unified.sessions',
                  {
                    defaultMessage: '{count} sessions',
                    values: { count: `${row.activity.count}${row.activity.partial ? '+' : ''}` },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.unified.invocations',
                  {
                    defaultMessage: '{count} invocations',
                    values: { count: `${row.activity.count}${row.activity.partial ? '+' : ''}` },
                  }
                )}
          </span>
        ) : (
          <span title={unknown}>{'—'}</span>
        ),
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.lastSeen', {
        defaultMessage: 'Last seen',
      }),
      sortable: true,
      width: '120px',
      render: (lastSeen?: string) =>
        lastSeen && Number.isFinite(Date.parse(lastSeen)) ? (
          <EuiToolTip content={new Date(lastSeen).toLocaleString()}>
            <time dateTime={lastSeen}>{new Date(lastSeen).toLocaleDateString()}</time>
          </EuiToolTip>
        ) : (
          <span title={unknown}>{'—'}</span>
        ),
    },
  ];

  const sourceStates = [
    {
      label: sourceLabels.entity_store,
      unavailable: entityUnavailable,
      partial: entityPartial,
      loading: entitySource.isLoading,
    },
    {
      label: sourceLabels.agent_builder,
      unavailable: agentUnavailable,
      partial: agentSource.status === 'partial',
      loading: agentSource.isLoading,
    },
    {
      label: sourceLabels.codex,
      unavailable: codexUnavailable,
      partial: codexPartial,
      loading: codexSource.isLoading,
    },
    {
      label: sourceLabels.cursor,
      unavailable: cursorUnavailable,
      partial: cursorPartial,
      loading: cursorSource.isLoading,
    },
    {
      label: sourceLabels.claude_desktop,
      unavailable: claudeDesktopUnavailable,
      partial: claudeDesktopPartial,
      loading: claudeDesktopSource.isLoading,
    },
    {
      label: sourceLabels.google_adk,
      unavailable: googleAdkUnavailable,
      partial: googleAdkPartial,
      loading: googleAdkSource.isLoading,
    },
  ].filter((source) => source.unavailable || source.partial || source.loading);

  return (
    <section data-test-subj="unifiedIdentityInventory">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.title', {
                defaultMessage: 'Identity inventory',
              })}{' '}
              <EuiBadge color="hollow">{rows.length}</EuiBadge>
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.unified.search',
              { defaultMessage: 'Search identities, sources, or IDs' }
            )}
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.unified.searchLabel',
              { defaultMessage: 'Search identities' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.unified.refresh',
              { defaultMessage: 'Refresh inventory' }
            )}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="refresh"
              isLoading={isRefreshing}
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.unified.refresh',
                { defaultMessage: 'Refresh inventory' }
              )}
              onClick={() => {
                void entitySource.refetch();
                agentSource.refetch();
                void codexSource.refetch();
                void cursorSource.refetch();
                void claudeDesktopSource.refetch();
                void googleAdkSource.refetch();
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            {[
              ...filterKinds,
              ...(rows.some((row) => row.kind === 'generic') ? ['generic' as const] : []),
            ].map((value) => (
              <EuiFilterButton
                key={value}
                hasActiveFilters={kind === value}
                numFilters={
                  value === 'all' ? rows.length : rows.filter((row) => row.kind === value).length
                }
                onClick={() => setKind(value)}
              >
                {labels[value]}
              </EuiFilterButton>
            ))}
          </EuiFilterGroup>
        </EuiFlexItem>
        {sourceStates.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" wrap>
              {sourceStates.map((source) => (
                <EuiFlexItem key={source.label} grow={false}>
                  <EuiBadge color={source.unavailable ? 'warning' : 'hollow'}>
                    {source.label}
                    {' · '}
                    {source.loading
                      ? i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.unified.loading',
                          { defaultMessage: 'Loading' }
                        )
                      : source.unavailable
                      ? unavailable
                      : i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.unified.partial',
                          { defaultMessage: 'Partial' }
                        )}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<UnifiedIdentityRow>
        tableCaption={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.unified.caption',
          {
            defaultMessage:
              'Identities across Entity Store, Agent Builder, Codex, Cursor, Claude Desktop, and Google ADK',
          }
        )}
        itemId="id"
        items={filteredRows}
        columns={columns}
        sorting
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        loading={isLoading && rows.length === 0}
        noItemsMessage={
          isLoading
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.unified.loadingRows',
                { defaultMessage: 'Loading identities…' }
              )
            : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.unified.noRows', {
                defaultMessage: 'No matching identities from the available sources.',
              })
        }
      />
      {(entityPartial ||
        codexPartial ||
        cursorPartial ||
        claudeDesktopPartial ||
        googleAdkPartial) && (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.unified.loadedScope',
              {
                defaultMessage:
                  'Filters apply to loaded identities. Entity Store: {entities} of {total}; Codex: {sessions}; Cursor: {cursorSessions} loaded sessions; Claude Desktop: {claudeConnections} MCP connections; Google ADK: {googleSessions} runs.',
                values: {
                  entities: entityUnavailable ? '—' : entitySource.entities.length,
                  total: entityUnavailable ? '—' : entitySource.total,
                  sessions: codexUnavailable ? '—' : codexSource.sessions.length,
                  cursorSessions: cursorUnavailable ? '—' : cursorSource.sessions.length,
                  googleSessions: googleAdkUnavailable ? '—' : googleAdkSource.sessions.length,
                  claudeConnections: claudeDesktopUnavailable
                    ? '—'
                    : claudeDesktopSource.sessions.length,
                },
              }
            )}
          </p>
        </EuiText>
      )}
    </section>
  );
};
