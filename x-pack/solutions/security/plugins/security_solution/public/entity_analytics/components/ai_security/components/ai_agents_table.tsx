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
import { TruncatedBadgeList } from '../../../../flyout_v2/entity/shared/components/entity_source_value';
import { useWatchlistLookup } from '../hooks/use_watchlist_lookup';
import type { AgentInventoryRow } from '../types';
import { getAgentDisplayName } from '../utils';
import { getAgentIconType } from './agent_logo';
import {
  COLUMN_AGENT,
  COLUMN_ALERTS,
  COLUMN_HOST,
  COLUMN_LAST_SEEN,
  COLUMN_RISK,
  COLUMN_RUNS_AS,
  COLUMN_SIGNED_IN_AS,
  COLUMN_WATCHLISTS,
  OPEN_FLYOUT,
  SEARCH_PLACEHOLDER,
  WATCHLISTS_OVERFLOW_TITLE,
} from '../translations';

export const AI_AGENTS_TABLE_TEST_ID = 'aiAgentsTable';

const LAST_SEEN_RELATIVE_HOURS = 24 * 7;

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
          field: 'accountEmails',
          name: COLUMN_SIGNED_IN_AS,
          truncateText: true,
          render: (emails: readonly string[]) => {
            const [first, ...rest] = emails;
            if (first == null) {
              return getEmptyTagValue();
            }
            return (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                  <EuiText size="s" className="eui-textTruncate">
                    {first}
                  </EuiText>
                </EuiFlexItem>
                {rest.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={rest.join(', ')}>
                      <EuiBadge color="hollow" tabIndex={0}>{`+${rest.length}`}</EuiBadge>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            );
          },
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
          truncateText: true,
          render: (userName: string) =>
            userName === 'root' ? <EuiBadge color="danger">{userName}</EuiBadge> : userName,
        },
        {
          field: 'lastSeen',
          name: COLUMN_LAST_SEEN,
          sortable: true,
          width: '128px',
          render: (value: string | undefined) =>
            value ? (
              <span className="eui-textNoWrap">
                <FormattedRelativePreferenceDate
                  value={value}
                  relativeThresholdInHrs={LAST_SEEN_RELATIVE_HOURS}
                />
              </span>
            ) : (
              getEmptyTagValue()
            ),
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
          width: '200px',
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
          width: '80px',
          render: (score: number | undefined) => <RiskScoreCell riskScore={score} />,
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
