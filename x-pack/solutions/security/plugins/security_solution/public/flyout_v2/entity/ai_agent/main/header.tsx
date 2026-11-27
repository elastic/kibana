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
import { getUnsanctionedAiAgentsWatchlistSavedObjectId } from '../../../../../common/entity_analytics/watchlists/constants';
import { AI_AGENT_TEST_IDS } from './test_ids';
import { ENTITY_TYPE_BADGE, RUNNING_NOW, UNSANCTIONED_BADGE } from './translations';

/** The agent is on the space's prebuilt "Unsanctioned AI agents" watchlist, matched by ID. */
export const isUnsanctionedAgent = (agent: AgentRow | undefined, spaceId: string | undefined) =>
  !!agent &&
  !!spaceId &&
  agent.watchlistIds.includes(getUnsanctionedAiAgentsWatchlistSavedObjectId(spaceId));

export interface AiAgentHeaderProps {
  readonly identity: AgentIdentity;
  readonly agent?: AgentRow;
  readonly isLoading: boolean;
  readonly isUnsanctioned?: boolean;
  /** A run's root process has a start event and no end event, within the running cap. */
  readonly isRunning?: boolean;
}

/**
 * Title, badges and last seen. Badges: entity type, "Unsanctioned" (which takes precedence over
 * the other watchlists, kept out of the header), risk level when scored and "Running now".
 */
export const AiAgentHeader = memo(
  ({
    identity,
    agent,
    isLoading,
    isUnsanctioned = false,
    isRunning = false,
  }: AiAgentHeaderProps) => {
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
          {isUnsanctioned && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger" data-test-subj={AI_AGENT_TEST_IDS.unsanctionedBadge}>
                {UNSANCTIONED_BADGE}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {agent?.riskLevel && (
            <EuiFlexItem grow={false} data-test-subj={AI_AGENT_TEST_IDS.riskBadge}>
              <RiskLevelBadge riskLevel={agent.riskLevel} />
            </EuiFlexItem>
          )}
          {isRunning && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent" data-test-subj={AI_AGENT_TEST_IDS.headerRunning}>
                {RUNNING_NOW}
              </EuiBadge>
            </EuiFlexItem>
          )}
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
  }
);
AiAgentHeader.displayName = 'AiAgentHeader';
