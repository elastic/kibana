/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { RiskLevelBadge } from '../../shared/components/risk_level_badge';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../entity_analytics/components/ai_agents/types';
import { getAgentDisplayName } from '../../../../entity_analytics/components/ai_agents/utils';
import { useWatchlistLookup } from '../../../../entity_analytics/components/ai_agents/hooks/use_watchlist_lookup';
import { UNKNOWN_VERSION } from '../../../../entity_analytics/components/ai_agents/translations';
import { WatchlistBadges } from './components/watchlist_badges';
import { AI_AGENT_TEST_IDS } from './test_ids';
import {
  ENTITY_TYPE_BADGE,
  FIRST_SEEN_LABEL,
  HOST_LABEL,
  LAST_SEEN_LABEL,
  NO_SCORE_YET,
  NOT_SIGNED_IN,
  RUNS_AS_LABEL,
  SIGNED_IN_AS_LABEL,
  VERSION_LABEL,
  WATCHLISTS_LABEL,
} from './translations';

export interface AiAgentHeaderProps {
  readonly identity: AgentIdentity;
  readonly agent?: AgentRow;
  readonly signedInAs?: string;
  readonly isLoading: boolean;
}

const formatDate = (value: string | undefined) =>
  value ? <PreferenceFormattedDate value={new Date(value)} /> : getEmptyTagValue();

const AgentWatchlists = memo(({ watchlistIds }: { watchlistIds: readonly string[] }) => {
  const watchlistLookup = useWatchlistLookup();
  return (
    <WatchlistBadges
      watchlists={watchlistLookup(watchlistIds)}
      data-test-subj={AI_AGENT_TEST_IDS.headerWatchlists}
    />
  );
});
AgentWatchlists.displayName = 'AgentWatchlists';

/**
 * Agent, host, runs as, signed in as, the agent's own watchlists, version and lifecycle, with risk
 * ("no score yet" when absent).
 */
export const AiAgentHeader = memo(
  ({ identity, agent, signedInAs, isLoading }: AiAgentHeaderProps) => (
    <div data-test-subj={AI_AGENT_TEST_IDS.header}>
      <FlyoutTitle
        title={`${getAgentDisplayName(identity.agentName)} · ${identity.userName}@${
          agent?.hostName ?? identity.hostId
        }`}
        iconType="sparkles"
      />
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{ENTITY_TYPE_BADGE}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {agent?.riskLevel ? (
            <span data-test-subj={AI_AGENT_TEST_IDS.riskBadge}>
              <RiskLevelBadge riskLevel={agent.riskLevel} riskScore={agent.riskScore} />
            </span>
          ) : (
            <EuiBadge color="default" data-test-subj={AI_AGENT_TEST_IDS.noScoreBadge}>
              {NO_SCORE_YET}
            </EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonText lines={2} size="xs" />
      ) : (
        <EuiDescriptionList
          compressed
          type="column"
          columnWidths={[1, 3]}
          listItems={[
            { title: HOST_LABEL, description: agent?.hostName ?? identity.hostId },
            { title: RUNS_AS_LABEL, description: identity.userName },
            { title: SIGNED_IN_AS_LABEL, description: signedInAs ?? NOT_SIGNED_IN },
            {
              title: WATCHLISTS_LABEL,
              description: <AgentWatchlists watchlistIds={agent?.watchlistIds ?? []} />,
            },
            { title: VERSION_LABEL, description: agent?.version ?? UNKNOWN_VERSION },
            { title: FIRST_SEEN_LABEL, description: formatDate(agent?.firstSeen) },
            { title: LAST_SEEN_LABEL, description: formatDate(agent?.lastSeen) },
          ]}
        />
      )}
    </div>
  )
);
AiAgentHeader.displayName = 'AiAgentHeader';
