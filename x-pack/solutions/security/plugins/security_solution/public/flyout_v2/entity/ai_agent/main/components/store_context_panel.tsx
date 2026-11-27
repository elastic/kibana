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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { AssetCriticalityBadge } from '../../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import type { AgentStoreContext } from '../../../../../entity_analytics/components/ai_agents/types';
import type { WatchlistLookup } from '../../../../../entity_analytics/components/ai_agents/hooks/use_watchlist_lookup';
import { GeneratedDataBadge } from './generated_data_badge';
import { WatchlistBadges } from './watchlist_badges';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  HOST_CRITICALITY_LABEL,
  IDP_UNKNOWN,
  MFA_OFF,
  MFA_ON,
  PERSON_CRITICALITY_LABEL,
  PERSON_MFA_LABEL,
  PERSON_WATCHLISTS_LABEL,
  sharedAccountBadge,
  STORE_CONTEXT_MISSING,
  STORE_CONTEXT_TITLE,
} from '../translations';

export interface StoreContextPanelProps {
  readonly storeContext?: AgentStoreContext;
  readonly watchlistLookup: WatchlistLookup;
  /** An IdP document behind a person's MFA value is tagged `poc-mock`. */
  readonly mfaIsMock: boolean;
}

/**
 * Facts the AI agent context maintainer keeps on the agent's own row, as opposed to the cards
 * below, which are read from the related rows and source indices when the flyout opens.
 */
export const StoreContextPanel = memo(
  ({ storeContext, watchlistLookup, mfaIsMock }: StoreContextPanelProps) => {
    const header = (
      <>
        <EuiTitle size="xxs">
          <h3>{STORE_CONTEXT_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
      </>
    );
    if (!storeContext) {
      return (
        <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.storeContext}>
          {header}
          <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.storeContextMissing}>
            {STORE_CONTEXT_MISSING}
          </EuiText>
        </EuiPanel>
      );
    }

    const {
      personWatchlistIds,
      personMfaEnabled,
      personCriticality,
      hostCriticality,
      sharedAccountInstalls = 0,
      computedAt,
    } = storeContext;
    const listItems = [
      {
        title: PERSON_WATCHLISTS_LABEL,
        description: (
          <WatchlistBadges
            watchlists={watchlistLookup(personWatchlistIds)}
            data-test-subj={AI_AGENT_TEST_IDS.storeContextWatchlists}
          />
        ),
      },
      {
        title: PERSON_MFA_LABEL,
        description: (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            data-test-subj={AI_AGENT_TEST_IDS.storeContextMfa}
          >
            <EuiFlexItem grow={false}>
              {personMfaEnabled === undefined ? (
                <EuiText size="xs">{IDP_UNKNOWN}</EuiText>
              ) : (
                <EuiBadge color={personMfaEnabled ? 'success' : 'danger'}>
                  {personMfaEnabled ? MFA_ON : MFA_OFF}
                </EuiBadge>
              )}
            </EuiFlexItem>
            {personMfaEnabled !== undefined && mfaIsMock && (
              <EuiFlexItem grow={false}>
                <GeneratedDataBadge />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      ...(personCriticality
        ? [
            {
              title: PERSON_CRITICALITY_LABEL,
              description: (
                <AssetCriticalityBadge criticalityLevel={personCriticality} textSize="xs" />
              ),
            },
          ]
        : []),
      {
        title: HOST_CRITICALITY_LABEL,
        description: (
          <AssetCriticalityBadge criticalityLevel={hostCriticality ?? 'unassigned'} textSize="xs" />
        ),
      },
    ];

    return (
      <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.storeContext}>
        {header}
        <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.storeContextUpdated}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.storeContext.description"
            defaultMessage="Kept on this agent's row by the AI agent context maintainer, not queried when the flyout opens. Updated {time}."
            values={{ time: <FormattedRelativePreferenceDate value={computedAt} /> }}
          />
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiDescriptionList compressed type="column" columnWidths={[1, 2]} listItems={listItems} />
        {sharedAccountInstalls > 0 && (
          <>
            <EuiSpacer size="xs" />
            <EuiBadge color="warning">{sharedAccountBadge(sharedAccountInstalls)}</EuiBadge>
          </>
        )}
      </EuiPanel>
    );
  }
);
StoreContextPanel.displayName = 'StoreContextPanel';
