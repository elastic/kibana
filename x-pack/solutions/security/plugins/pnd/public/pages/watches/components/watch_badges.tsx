/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { compareWatchesForDisplay, type Watch } from '@kbn/pnd-common';
import { useWatches } from '../../../hooks/use_watches_api';
import * as i18n from '../translations';

interface WatchBadgesProps {
  /** Watch ids this worker or skill is attached to. */
  watchIds: string[];
}

/**
 * One badge per attached watch: the watch's full name with its accent colour shown as a dot, linking
 * to that watch's settings page.
 *
 * The dot is `EuiBadge`'s own icon slot rather than a hand-rolled element, so spacing and sizing come
 * from EUI. The single style override exists because the badge forces `color="inherit"` on its icon
 * to match the label; a descendant selector re-colours just the dot without touching the text.
 */
export const WatchBadges: React.FC<WatchBadgesProps> = ({ watchIds }) => {
  const history = useHistory();
  const { data } = useWatches();

  const attached = useMemo(() => {
    const byId = new Map((data?.watches ?? []).map((watch) => [watch.id, watch]));
    return watchIds
      .map((watchId) => byId.get(watchId))
      .filter((watch): watch is Watch => watch != null)
      .sort(compareWatchesForDisplay);
  }, [data?.watches, watchIds]);

  if (attached.length === 0) {
    return null;
  }

  return (
    <EuiBadgeGroup gutterSize="xs">
      {attached.map((watch) => (
        <EuiBadge
          key={watch.id}
          color="hollow"
          iconType="dot"
          iconSide="left"
          onClick={() => history.push(`/watches/${encodeURIComponent(watch.id)}`)}
          onClickAriaLabel={i18n.viewWatchAriaLabel(watch.name)}
          data-test-subj={`pndWatchBadge-${watch.id}`}
          css={css`
            .euiBadge__icon {
              color: ${watch.color};
            }
          `}
        >
          {watch.name}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};
