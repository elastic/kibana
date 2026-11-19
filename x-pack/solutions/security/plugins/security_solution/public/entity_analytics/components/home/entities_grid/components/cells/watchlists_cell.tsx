/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  TruncatedBadgeList,
  toEntitySourceArray,
} from '../../../../../../flyout/entity_details/shared/components/entity_source_value';

const WATCHLISTS_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.watchlistsOverflowTitle',
  { defaultMessage: 'Additional watchlists' }
);

export const WatchlistsCell = memo(
  ({ value, watchlistNames }: { value: unknown; watchlistNames: Map<string, string> }) => {
    const names = toEntitySourceArray(value).map((id) => watchlistNames.get(id) ?? id);
    return (
      <TruncatedBadgeList
        values={names}
        overflowTooltipTitle={WATCHLISTS_OVERFLOW_TOOLTIP_TITLE}
        textSize="s"
        data-test-subj="entityWatchlistsValue"
      />
    );
  }
);
WatchlistsCell.displayName = 'WatchlistsCell';
