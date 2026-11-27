/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { RiskScoreCell } from '../../home/entities_table/risk_score_cell';
import { AssetCriticalityBadge } from '../../asset_criticality/asset_criticality_badge';
import { TruncatedBadgeList } from '../../../../flyout_v2/entity/shared/components/entity_source_value';
import { useWatchlistLookup } from '../hooks/use_watchlist_lookup';
import type { AgentInventoryRow } from '../types';
import { AiAgentsTable } from './ai_agents_table';
import {
  getHostGroups,
  getPersonGroups,
  type AgentGroup,
  type AgentGroupByOption,
} from './agent_groups';
import {
  GROUP_NO_ACCOUNT,
  GROUP_NO_MATCHING_PERSON,
  GROUP_STAT_AGENTS,
  GROUP_STAT_ALERTS,
  GROUP_STAT_HOSTS,
  GROUP_STAT_INSTALLS,
  GROUP_STAT_MAX_RISK,
  GROUP_STAT_PEOPLE,
  WATCHLISTS_OVERFLOW_TITLE,
} from '../translations';

export const AI_AGENTS_GROUPS_TEST_ID = 'aiAgentsGroups';

const GroupStat = ({
  label,
  children,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  children: React.ReactNode;
  'data-test-subj'?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj={dataTestSubj}>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const GroupStats = ({
  group,
  alertsUnavailable,
}: {
  group: AgentGroup;
  alertsUnavailable: boolean;
}) => (
  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap={false}>
    {group.kind === 'host' ? (
      <>
        <GroupStat label={GROUP_STAT_AGENTS} data-test-subj="aiAgentsGroupInstalls">
          <EuiBadge color="hollow">{group.rows.length}</EuiBadge>
        </GroupStat>
        <GroupStat label={GROUP_STAT_PEOPLE} data-test-subj="aiAgentsGroupPeople">
          <EuiBadge color="hollow">{group.peopleCount}</EuiBadge>
        </GroupStat>
      </>
    ) : (
      <>
        <GroupStat label={GROUP_STAT_INSTALLS} data-test-subj="aiAgentsGroupInstalls">
          <EuiBadge color="hollow">{group.rows.length}</EuiBadge>
        </GroupStat>
        <GroupStat label={GROUP_STAT_HOSTS} data-test-subj="aiAgentsGroupHosts">
          <EuiBadge color="hollow">{group.hostCount}</EuiBadge>
        </GroupStat>
      </>
    )}
    <GroupStat label={GROUP_STAT_MAX_RISK} data-test-subj="aiAgentsGroupMaxRisk">
      <RiskScoreCell riskScore={group.maxRiskScore} />
    </GroupStat>
    <GroupStat label={GROUP_STAT_ALERTS} data-test-subj="aiAgentsGroupAlerts">
      {alertsUnavailable ? (
        getEmptyTagValue()
      ) : (
        <EuiBadge color={group.alertCount > 0 ? 'danger' : 'hollow'}>{group.alertCount}</EuiBadge>
      )}
    </GroupStat>
  </EuiFlexGroup>
);

const GroupTitle = ({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
    <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
      <EuiTitle size="xxs">
        <h4 className="eui-textTruncate" title={title}>
          {title}
        </h4>
      </EuiTitle>
    </EuiFlexItem>
    {subtitle && (
      <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
        {subtitle}
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

const GroupHeader = ({ group }: { group: AgentGroup }) => {
  const watchlistLookup = useWatchlistLookup();
  switch (group.kind) {
    case 'person':
      return (
        <GroupTitle
          title={group.person.name}
          subtitle={
            group.person.watchlistIds.length > 0 && (
              <TruncatedBadgeList
                values={watchlistLookup(group.person.watchlistIds).map(({ name }) => name)}
                overflowTooltipTitle={WATCHLISTS_OVERFLOW_TITLE}
                showValueTooltip
                textSize="xs"
                data-test-subj="aiAgentsGroupPersonWatchlists"
              />
            )
          }
        />
      );
    case 'unmatched':
      return (
        <GroupTitle
          title={group.email}
          subtitle={<EuiBadge color="hollow">{GROUP_NO_MATCHING_PERSON}</EuiBadge>}
        />
      );
    case 'noAccount':
      return <GroupTitle title={GROUP_NO_ACCOUNT} />;
    case 'host':
      return (
        <GroupTitle
          title={group.hostName ?? group.hostId}
          subtitle={
            group.criticality &&
            group.criticality !== 'unassigned' && (
              <AssetCriticalityBadge
                criticalityLevel={group.criticality}
                dataTestSubj="aiAgentsGroupHostCriticality"
              />
            )
          }
        />
      );
  }
};

export interface AiAgentsGroupsProps {
  readonly groupBy: AgentGroupByOption;
  readonly rows: readonly AgentInventoryRow[];
  readonly alertsUnavailable: boolean;
  readonly unsanctionedWatchlistId: string;
  readonly onOpenAgent: (row: AgentInventoryRow) => void;
}

/** Client-side Group by: one accordion per person or host, its installs in the same table. */
export const AiAgentsGroups = ({
  groupBy,
  rows,
  alertsUnavailable,
  unsanctionedWatchlistId,
  onOpenAgent,
}: AiAgentsGroupsProps) => {
  const groups = useMemo(
    (): AgentGroup[] => (groupBy === 'person' ? getPersonGroups(rows) : getHostGroups(rows)),
    [groupBy, rows]
  );

  return (
    <div data-test-subj={AI_AGENTS_GROUPS_TEST_ID}>
      {groups.map((group, index) => (
        <React.Fragment key={group.key}>
          {index > 0 && <EuiSpacer size="s" />}
          <EuiAccordion
            id={`aiAgentsGroup-${groupBy}-${group.key}`}
            borders="all"
            paddingSize="m"
            buttonElement="div"
            buttonContent={<GroupHeader group={group} />}
            extraAction={<GroupStats group={group} alertsUnavailable={alertsUnavailable} />}
            data-test-subj={`aiAgentsGroup-${group.key}`}
          >
            <AiAgentsTable
              rows={group.rows}
              loading={false}
              alertsUnavailable={alertsUnavailable}
              unsanctionedWatchlistId={unsanctionedWatchlistId}
              onOpenAgent={onOpenAgent}
              initialPageSize={10}
              data-test-subj={`aiAgentsGroupTable-${group.key}`}
            />
          </EuiAccordion>
        </React.Fragment>
      ))}
    </div>
  );
};
