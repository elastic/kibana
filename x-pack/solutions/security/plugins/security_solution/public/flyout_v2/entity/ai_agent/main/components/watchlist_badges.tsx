/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { WatchlistLabel } from '../../../../../entity_analytics/components/ai_agents/hooks/use_watchlist_lookup';
import { NONE, watchlistRiskModifierTooltip } from '../translations';

/** Watchlist names as badges, with the watchlist's risk modifier in a tooltip when it has one. */
export const WatchlistBadges = memo(
  ({
    watchlists,
    'data-test-subj': dataTestSubj,
  }: {
    watchlists: readonly WatchlistLabel[];
    'data-test-subj'?: string;
  }) =>
    watchlists.length === 0 ? (
      <EuiText size="xs" data-test-subj={dataTestSubj}>
        {NONE}
      </EuiText>
    ) : (
      <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj={dataTestSubj}>
        {watchlists.map(({ id, name, riskModifier }) => (
          <EuiFlexItem grow={false} key={id}>
            {riskModifier === undefined ? (
              <EuiBadge color="warning">{name}</EuiBadge>
            ) : (
              <EuiToolTip content={watchlistRiskModifierTooltip(riskModifier)}>
                <EuiBadge color="warning" tabIndex={0}>
                  {name}
                </EuiBadge>
              </EuiToolTip>
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    )
);
WatchlistBadges.displayName = 'WatchlistBadges';
