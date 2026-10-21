/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiSkeletonText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import {
  compareWatchesForDisplay,
  resolveWatchAccent,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  type Watch,
} from '@kbn/alertzero-common';
import { ALERTZERO_WATCHES_SUBNAV_WIDTH } from '../../../components/layout/constants';
// Shared with the deep-link registry, which is page-load critical — see the note on their definition.
import { useWatches } from '../../../hooks/use_watches_api';
import * as i18n from '../translations';

/**
 * Either a watch id or one of the global section ids above. Not a closed union: the watch list is
 * data, so the nav cannot know the ids ahead of time.
 */
export type WatchesSectionId = string;

/** Matches unexported `COMPACT_MIN_HEIGHT_PX` in `@kbn/ui-app-header`. */
const NAV_HEADER_HEIGHT_PX = 48;

interface AlertZeroWatchesNavProps {
  active: WatchesSectionId;
}

export const AlertZeroWatchesNav: React.FC<AlertZeroWatchesNavProps> = ({ active }) => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading } = useWatches();

  const watches = useMemo(
    () =>
      [...(data?.watches ?? [])]
        .filter((watch) => watch.id !== SYSTEM_SECURITY_WATCH_OFFICER_ID)
        .sort(compareWatchesForDisplay),
    [data?.watches]
  );

  return (
    <aside
      aria-label={i18n.SUBNAV_ARIA_LABEL}
      data-test-subj="alertZeroWatchesSubnav"
      css={css`
        display: flex;
        flex-direction: column;
        width: ${ALERTZERO_WATCHES_SUBNAV_WIDTH}px;
        flex-shrink: 0;
        height: 100%;
        border-right: 1px solid ${euiTheme.border.color};
        background: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          /* 48px row + border below it — compact AppHeader puts min-height on the row, not the box. */
          min-height: calc(${NAV_HEADER_HEIGHT_PX}px + ${euiTheme.border.width.thin});
          padding: 0 ${euiTheme.size.m};
          border-bottom: ${euiTheme.border.thin};
          flex-shrink: 0;
        `}
      >
        <EuiTitle size="xs">
          <h2>{i18n.PAGE_TITLE}</h2>
        </EuiTitle>
      </div>

      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: ${euiTheme.size.s};
        `}
      >
        {isLoading && watches.length === 0 ? (
          <EuiSkeletonText
            lines={5}
            size="s"
            isLoading
            announceLoadedStatus={false}
            aria-label={i18n.LOADING_WATCHES}
            data-test-subj="alertZeroWatchesSubnavLoading"
          />
        ) : (
          <EuiListGroup
            maxWidth={false}
            css={css`
              display: flex;
              flex-direction: column;
              gap: 2px;
            `}
          >
            {watches.map((watch) => (
              <WatchNavItem key={watch.id} watch={watch} isActive={watch.id === active} />
            ))}
          </EuiListGroup>
        )}
      </div>
    </aside>
  );
};

const WatchNavItem: React.FC<{ watch: Watch; isActive: boolean }> = ({ watch, isActive }) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const accent = resolveWatchAccent(euiTheme.colors, watch.color);
  const path = `/watches/${encodeURIComponent(watch.id)}`;

  const label = (
    <span
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        max-width: 100%;
        min-width: 0;
      `}
    >
      <span
        aria-hidden={true}
        css={css`
          flex-shrink: 0;
          width: ${euiTheme.size.s};
          height: ${euiTheme.size.s};
          border-radius: 50%;
          background: ${accent};
        `}
      />
      <span
        css={css`
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {watch.name}
      </span>
    </span>
  );

  return (
    <EuiListGroupItem
      label={label}
      isActive={isActive}
      onClick={() => history.push(path)}
      data-test-subj={`alertZeroWatchesSubnav-${watch.id}`}
      aria-current={isActive ? 'page' : undefined}
    />
  );
};
