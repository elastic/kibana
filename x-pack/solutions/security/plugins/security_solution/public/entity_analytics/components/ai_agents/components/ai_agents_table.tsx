/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
  type EuiSearchBarProps,
} from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { RiskScoreCell } from '../../home/entities_table/risk_score_cell';
import { RiskLevelBadge } from '../../../../flyout_v2/entity/shared/components/risk_level_badge';
import { TruncatedBadgeList } from '../../../../flyout_v2/entity/shared/components/entity_source_value';
import { useWatchlistLookup } from '../hooks/use_watchlist_lookup';
import type { AgentInventoryRow } from '../types';
import { getAgentDisplayName } from '../utils';
import { getAgentIconType } from './agent_logo';
import {
  COLUMN_ACCOUNTS,
  COLUMN_AGENT,
  COLUMN_ALERTS,
  COLUMN_FIRST_SEEN,
  COLUMN_HOST,
  COLUMN_LAST_SEEN,
  COLUMN_RISK,
  COLUMN_RUNS_AS,
  COLUMN_VERSION,
  COLUMN_WATCHLISTS,
  NO_ACCOUNT,
  NO_SCORE_YET,
  OPEN_FLYOUT,
  SEARCH_PLACEHOLDER,
  UNKNOWN_VERSION,
  WATCHLISTS_OVERFLOW_TITLE,
} from '../translations';

export const AI_AGENTS_TABLE_TEST_ID = 'aiAgentsTable';

export interface AiAgentsTableProps {
  readonly rows: readonly AgentInventoryRow[];
  readonly loading: boolean;
  readonly alertsUnavailable: boolean;
  readonly onOpenAgent: (row: AgentInventoryRow) => void;
}

/** One row per install. "Runs as" is the OS user, not an owner: most runners are shared accounts. */
export const AiAgentsTable = memo(
  ({ rows, loading, alertsUnavailable, onOpenAgent }: AiAgentsTableProps) => {
    const watchlistLookup = useWatchlistLookup();
    const columns = useMemo<Array<EuiBasicTableColumn<AgentInventoryRow>>>(
      () => [
        {
          name: '',
          width: '40px',
          render: (row: AgentInventoryRow) => (
            <EuiToolTip content={OPEN_FLYOUT} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="maximize"
                aria-label={OPEN_FLYOUT}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpenAgent(row);
                }}
                data-test-subj="aiAgentsTableOpenFlyout"
              />
            </EuiToolTip>
          ),
        },
        {
          field: 'agentName',
          name: COLUMN_AGENT,
          sortable: true,
          width: '150px',
          render: (agentName: string) => (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={getAgentIconType(agentName)} aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <strong>{getAgentDisplayName(agentName)}</strong>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'hostName',
          name: COLUMN_HOST,
          sortable: true,
          truncateText: true,
          render: (hostName: string | undefined, row: AgentInventoryRow) => hostName ?? row.hostId,
        },
        {
          field: 'userName',
          name: COLUMN_RUNS_AS,
          sortable: true,
          render: (userName: string) =>
            userName === 'root' ? <EuiBadge color="danger">{userName}</EuiBadge> : userName,
        },
        {
          field: 'accountEmails',
          name: COLUMN_ACCOUNTS,
          render: (emails: readonly string[]) =>
            emails.length === 0 ? (
              <EuiText size="xs" color="subdued">
                {NO_ACCOUNT}
              </EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="none">
                {emails.map((email) => (
                  <EuiFlexItem key={email}>
                    <EuiText size="xs">{email}</EuiText>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
        },
        {
          field: 'version',
          name: COLUMN_VERSION,
          sortable: true,
          render: (version: string | undefined) => version ?? UNKNOWN_VERSION,
        },
        {
          field: 'firstSeen',
          name: COLUMN_FIRST_SEEN,
          sortable: true,
          render: (value: string | undefined) =>
            value ? <FormattedRelativePreferenceDate value={value} /> : getEmptyTagValue(),
        },
        {
          field: 'lastSeen',
          name: COLUMN_LAST_SEEN,
          sortable: true,
          render: (value: string | undefined) =>
            value ? <FormattedRelativePreferenceDate value={value} /> : getEmptyTagValue(),
        },
        {
          field: 'alertCount',
          name: COLUMN_ALERTS,
          sortable: true,
          width: '96px',
          render: (count: number) =>
            alertsUnavailable ? (
              getEmptyTagValue()
            ) : count > 0 ? (
              <EuiBadge color="danger">{count}</EuiBadge>
            ) : (
              0
            ),
        },
        {
          field: 'watchlistIds',
          name: COLUMN_WATCHLISTS,
          width: '160px',
          render: (watchlistIds: readonly string[]) => (
            <TruncatedBadgeList
              values={watchlistLookup(watchlistIds).map(({ name }) => name)}
              overflowTooltipTitle={WATCHLISTS_OVERFLOW_TITLE}
              showValueTooltip
              textSize="xs"
              data-test-subj="aiAgentsTableWatchlists"
            />
          ),
        },
        {
          field: 'riskScore',
          name: COLUMN_RISK,
          sortable: true,
          render: (score: number | undefined, row: AgentInventoryRow) =>
            score == null && !row.riskLevel ? (
              <EuiText size="xs" color="subdued">
                {NO_SCORE_YET}
              </EuiText>
            ) : row.riskLevel ? (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <RiskScoreCell riskScore={score} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <RiskLevelBadge riskLevel={row.riskLevel} />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <RiskScoreCell riskScore={score} />
            ),
        },
      ],
      [alertsUnavailable, onOpenAgent, watchlistLookup]
    );

    const search = useMemo<EuiSearchBarProps>(
      () => ({ box: { incremental: true, placeholder: SEARCH_PLACEHOLDER } }),
      []
    );

    const items = useMemo(
      () =>
        rows.map((row) => ({
          ...row,
          searchText: [
            row.agentName,
            row.hostName,
            row.hostId,
            row.userName,
            ...row.accountEmails,
            ...watchlistLookup(row.watchlistIds).map(({ name }) => name),
          ]
            .filter(Boolean)
            .join(' '),
        })),
      [rows, watchlistLookup]
    );

    return (
      <EuiInMemoryTable<AgentInventoryRow & { searchText: string }>
        items={items}
        columns={columns}
        loading={loading}
        search={search}
        sorting={{ sort: { field: 'lastSeen', direction: 'desc' } }}
        pagination={{ initialPageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
        rowProps={(row) => ({
          onClick: () => onOpenAgent(row),
          'data-test-subj': `aiAgentsTableRow-${row.entityId}`,
        })}
        tableLayout="auto"
        data-test-subj={AI_AGENTS_TABLE_TEST_ID}
        tableCaption={COLUMN_AGENT}
      />
    );
  }
);
AiAgentsTable.displayName = 'AiAgentsTable';
