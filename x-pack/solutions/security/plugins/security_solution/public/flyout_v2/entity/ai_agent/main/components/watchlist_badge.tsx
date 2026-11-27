/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { WatchlistLabel } from '../../../../../entity_analytics/components/ai_security/hooks/use_watchlist_lookup';
import { watchlistRiskModifierTooltip } from '../translations';

/** A watchlist name as a badge, with the watchlist's risk modifier in a tooltip when it has one. */
export const WatchlistBadge = memo(({ watchlist }: { watchlist: WatchlistLabel }) => {
  const { name, riskModifier } = watchlist;
  if (riskModifier === undefined) return <EuiBadge color="warning">{name}</EuiBadge>;
  return (
    <EuiToolTip content={watchlistRiskModifierTooltip(riskModifier)}>
      <EuiBadge color="warning" tabIndex={0}>
        {name}
      </EuiBadge>
    </EuiToolTip>
  );
});
WatchlistBadge.displayName = 'WatchlistBadge';
