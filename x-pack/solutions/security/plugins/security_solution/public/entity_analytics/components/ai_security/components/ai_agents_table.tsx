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
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { RiskScoreCell } from '../../home/entities_table/risk_score_cell';
import { getCriticalityLevelColor } from '../../asset_criticality/asset_criticality_badge';
import { CRITICALITY_LEVEL_TITLE } from '../../asset_criticality/translations';
import { TruncatedBadgeList } from '../../../../flyout_v2/entity/shared/components/entity_source_value';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { useWatchlistLookup } from '../hooks/use_watchlist_lookup';
import type { AgentActivityProfile, AgentInventoryRow, SignedInAccount } from '../types';
import { getAccountEmails, getAccountLabel, getAgentDisplayName } from '../utils';
import { getAgentRiskSortValue, getSessionsSortValue, isUnsanctioned } from './agent_filters';
import { getAgentIconType } from './agent_logo';
import {
  COLUMN_AGENT,
  COLUMN_AGENT_RISK,
  COLUMN_AGENT_RISK_TOOLTIP,
  COLUMN_ALERTS,
  COLUMN_HOST,
  COLUMN_LAST_SEEN,
  COLUMN_RUNS_AS,
  COLUMN_SESSIONS,
  COLUMN_SESSIONS_TOOLTIP,
  COLUMN_SIGNED_IN_AS,
  COLUMN_WATCHLISTS,
  HOST_CRITICALITY_TOOLTIP,
  OPEN_FLYOUT,
  SESSIONS_ACTIVE_DAYS,
  UNSANCTIONED_BADGE,
  UNSANCTIONED_BADGE_TOOLTIP,
  WATCHLISTS_OVERFLOW_TITLE,
} from '../translations';

export const AI_AGENTS_TABLE_TEST_ID = 'aiAgentsTable';

const LAST_SEEN_RELATIVE_HOURS = 24 * 7;

const accountTooltip = (account: SignedInAccount): string => {
  const emails = getAccountEmails(account).join(', ');
  return account.person && emails ? `${account.person.name} (${emails})` : emails;
};

const SignedInAsCell = ({ accounts }: { accounts: readonly SignedInAccount[] }) => {
  const [first, ...rest] = accounts;
  if (first == null) return getEmptyTagValue();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
        <EuiToolTip content={accountTooltip(first)} display="block">
          <EuiText
            size="s"
            className="eui-textTruncate"
            tabIndex={0}
            data-test-subj="aiAgentsTableSignedInAs"
          >
            {getAccountLabel(first)}
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
      {rest.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={rest.map(accountTooltip).join(', ')}>
            <EuiBadge color="hollow" tabIndex={0}>{`+${rest.length}`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** The host's criticality as an `AssetCriticalityBadge` dot, with the level in a tooltip. */
const CriticalityDot = ({ level }: { level: CriticalityLevelWithUnassigned }) => {
  const { euiTheme } = useEuiTheme();
  const title = HOST_CRITICALITY_TOOLTIP(CRITICALITY_LEVEL_TITLE[level]);
  return (
    <EuiToolTip content={title}>
      <EuiHealth
        color={getCriticalityLevelColor(euiTheme, level)}
        tabIndex={0}
        aria-label={title}
        data-test-subj="aiAgentsTableHostCriticality"
      />
    </EuiToolTip>
  );
};

/** Sessions in the last 30 days, with active days in a tooltip. Empty until the maintainer runs. */
const SessionsCell = ({ profile }: { profile?: AgentActivityProfile }) => {
  if (profile?.activeDays == null) {
    return (
      <span data-test-subj="aiAgentsTableSessions">
        {profile ? profile.sessions : getEmptyTagValue()}
      </span>
    );
  }
  return (
    <EuiToolTip content={SESSIONS_ACTIVE_DAYS(profile.activeDays)}>
      <span tabIndex={0} data-test-subj="aiAgentsTableSessions">
        {profile.sessions}
      </span>
    </EuiToolTip>
  );
};

export interface AiAgentsTableProps {
  readonly rows: readonly AgentInventoryRow[];
  readonly loading: boolean;
  readonly alertsUnavailable: boolean;
  readonly unsanctionedWatchlistId: string;
  readonly onOpenAgent: (row: AgentInventoryRow) => void;
  readonly initialPageSize?: number;
  readonly 'data-test-subj'?: string;
}

/** One row per install. "Runs as" is the OS user, not an owner: most runners are shared accounts. */
export const AiAgentsTable = memo(
  ({
    rows,
    loading,
    alertsUnavailable,
    unsanctionedWatchlistId,
    onOpenAgent,
    initialPageSize = 25,
    'data-test-subj': dataTestSubj = AI_AGENTS_TABLE_TEST_ID,
  }: AiAgentsTableProps) => {
    const watchlistLookup = useWatchlistLookup();
    const hasUnsanctionedRows = useMemo(
      () => rows.some((row) => isUnsanctioned(row, unsanctionedWatchlistId)),
      [rows, unsanctionedWatchlistId]
    );
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
          width: hasUnsanctionedRows ? '256px' : '144px',
          render: (agentName: string, row: AgentInventoryRow) => (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={getAgentIconType(agentName)} aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} className="eui-textNoWrap">
                <strong>{getAgentDisplayName(agentName)}</strong>
              </EuiFlexItem>
              {isUnsanctioned(row, unsanctionedWatchlistId) && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={UNSANCTIONED_BADGE_TOOLTIP}>
                    <EuiBadge
                      color="danger"
                      tabIndex={0}
                      data-test-subj="aiAgentsTableUnsanctionedBadge"
                    >
                      {UNSANCTIONED_BADGE}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ),
        },
        {
          field: 'accounts',
          name: COLUMN_SIGNED_IN_AS,
          truncateText: true,
          render: (accounts: readonly SignedInAccount[]) => <SignedInAsCell accounts={accounts} />,
        },
        {
          field: 'hostName',
          name: COLUMN_HOST,
          sortable: true,
          truncateText: true,
          render: (hostName: string | undefined, row: AgentInventoryRow) => {
            const criticality = row.storeContext?.hostCriticality;
            return (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                  <EuiText size="s" className="eui-textTruncate" title={hostName ?? row.hostId}>
                    {hostName ?? row.hostId}
                  </EuiText>
                </EuiFlexItem>
                {criticality && criticality !== 'unassigned' && (
                  <EuiFlexItem grow={false}>
                    <CriticalityDot level={criticality} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            );
          },
        },
        {
          field: 'userName',
          name: COLUMN_RUNS_AS,
          sortable: true,
          truncateText: true,
          width: '104px',
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
          field: 'activityProfile',
          name: COLUMN_SESSIONS,
          nameTooltip: { content: COLUMN_SESSIONS_TOOLTIP },
          sortable: getSessionsSortValue,
          width: '152px',
          render: (profile: AgentActivityProfile | undefined) => <SessionsCell profile={profile} />,
        },
        {
          field: 'alertCount',
          name: COLUMN_ALERTS,
          sortable: true,
          width: '104px',
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
          width: '140px',
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
          name: COLUMN_AGENT_RISK,
          nameTooltip: { content: COLUMN_AGENT_RISK_TOOLTIP },
          sortable: getAgentRiskSortValue,
          width: '116px',
          render: (score: number | undefined) => <RiskScoreCell riskScore={score} />,
        },
      ],
      [
        alertsUnavailable,
        hasUnsanctionedRows,
        onOpenAgent,
        unsanctionedWatchlistId,
        watchlistLookup,
      ]
    );

    const items = useMemo(() => [...rows], [rows]);

    return (
      <EuiInMemoryTable<AgentInventoryRow>
        items={items}
        columns={columns}
        loading={loading}
        sorting={{ sort: { field: 'riskScore', direction: 'desc' } }}
        pagination={{ initialPageSize, pageSizeOptions: [10, 25, 50, 100] }}
        rowProps={(row) => ({
          onClick: () => onOpenAgent(row),
          'data-test-subj': `aiAgentsTableRow-${row.entityId}`,
        })}
        tableLayout="fixed"
        data-test-subj={dataTestSubj}
        tableCaption={COLUMN_AGENT}
      />
    );
  }
);
AiAgentsTable.displayName = 'AiAgentsTable';
