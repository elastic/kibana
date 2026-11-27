/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { RiskLevelBadge } from '../../shared/components/risk_level_badge';
import { ONE_WEEK_IN_HOURS } from '../../shared/constants';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../entity_analytics/components/ai_security/types';
import { getAgentTitle } from '../../../../entity_analytics/components/ai_security/utils';
import { getAgentIconType } from '../../../../entity_analytics/components/ai_security/components/agent_logo';
import { useWatchlistLookup } from '../../../../entity_analytics/components/ai_security/hooks/use_watchlist_lookup';
import { WatchlistBadge } from './components/watchlist_badge';
import { AI_AGENT_TEST_IDS } from './test_ids';
import { ENTITY_TYPE_BADGE } from './translations';

export interface AiAgentHeaderProps {
  readonly identity: AgentIdentity;
  readonly agent?: AgentRow;
  readonly isLoading: boolean;
}

/** Title, one badge row (entity type, risk when scored, the agent's own watchlists) and last seen. */
export const AiAgentHeader = memo(({ identity, agent, isLoading }: AiAgentHeaderProps) => {
  const watchlistLookup = useWatchlistLookup();
  const watchlists = watchlistLookup(agent?.watchlistIds ?? []);
  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.header}>
      <FlyoutTitle
        title={getAgentTitle(identity, agent?.hostName)}
        iconType={getAgentIconType(identity.agentName)}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{ENTITY_TYPE_BADGE}</EuiBadge>
        </EuiFlexItem>
        {agent?.riskLevel && (
          <EuiFlexItem grow={false} data-test-subj={AI_AGENT_TEST_IDS.riskBadge}>
            <RiskLevelBadge riskLevel={agent.riskLevel} riskScore={agent.riskScore} />
          </EuiFlexItem>
        )}
        {watchlists.map((watchlist) => (
          <EuiFlexItem
            grow={false}
            key={watchlist.id}
            data-test-subj={AI_AGENT_TEST_IDS.headerWatchlist}
          >
            <WatchlistBadge watchlist={watchlist} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {isLoading ? (
        <>
          <EuiSpacer size="s" />
          <EuiSkeletonText lines={1} size="xs" />
        </>
      ) : (
        agent?.lastSeen && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.lastSeen}>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.header.lastSeenAt"
                defaultMessage="Last seen {time}"
                values={{
                  time: (
                    <FormattedRelativePreferenceDate
                      value={agent.lastSeen}
                      relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                    />
                  ),
                }}
              />
            </EuiText>
          </>
        )
      )}
    </div>
  );
});
AiAgentHeader.displayName = 'AiAgentHeader';
