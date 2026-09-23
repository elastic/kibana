/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiTitle,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { compareWatchesForDisplay, type Lifecycle, type Watch } from '@kbn/pnd-common';
import { PND_WATCHES_SUBNAV_WIDTH } from '../../../components/layout/constants';
// Shared with the deep-link registry, which is page-load critical — see the note on their definition.
import { useWatches } from '../../../hooks/use_watches_api';
import * as i18n from '../translations';

/**
 * Either a watch id or one of the global section ids above. Not a closed union: the watch list is
 * data, so the nav cannot know the ids ahead of time.
 */
export type WatchesSectionId = string;

const LIFECYCLE_LABEL: Record<Exclude<Lifecycle, 'ga'>, string> = {
  beta: i18n.LIFECYCLE_BETA,
  pilot: i18n.LIFECYCLE_PILOT,
};
interface PndWatchesNavProps {
  active: WatchesSectionId;
  onCollapse: () => void;
}

export const PndWatchesNav: React.FC<PndWatchesNavProps> = ({ active, onCollapse }) => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading } = useWatches();

  const watches = useMemo(
    () => [...(data?.watches ?? [])].sort(compareWatchesForDisplay),
    [data?.watches]
  );

  return (
    <aside
      aria-label={i18n.SUBNAV_ARIA_LABEL}
      data-test-subj="pndWatchesSubnav"
      css={css`
        width: ${PND_WATCHES_SUBNAV_WIDTH}px;
        flex-shrink: 0;
        height: 100%;
        padding: ${euiTheme.size.m};
        border-right: 1px solid ${euiTheme.border.color};
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{i18n.PAGE_TITLE}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.SUBNAV_COLLAPSE} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="menuLeft"
              aria-label={i18n.SUBNAV_COLLAPSE}
              color="text"
              display="base"
              data-test-subj="pndWatchesSubnavCollapse"
              onClick={onCollapse}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        responsive={false}
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        {isLoading && watches.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiSkeletonText
              lines={5}
              size="s"
              isLoading
              announceLoadedStatus={false}
              aria-label={i18n.LOADING_WATCHES}
              data-test-subj="pndWatchesSubnavLoading"
            />
          </EuiFlexItem>
        ) : (
          watches.map((watch) => (
            <EuiFlexItem key={watch.id} grow={false}>
              <WatchNavItem watch={watch} isActive={watch.id === active} />
            </EuiFlexItem>
          ))
        )}
      </EuiFlexGroup>
    </aside>
  );
};

const WatchNavItem: React.FC<{ watch: Watch; isActive: boolean }> = ({ watch, isActive }) => {
  const { euiTheme } = useEuiTheme();
  const lifecycle = watch.lifecycle && watch.lifecycle !== 'ga' ? watch.lifecycle : undefined;

  return (
    <NavButton id={watch.id} path={`/watches/${encodeURIComponent(watch.id)}`} isActive={isActive}>
      <span
        aria-hidden={true}
        css={css`
          flex-shrink: 0;
          width: ${euiTheme.size.s};
          height: ${euiTheme.size.s};
          border-radius: 50%;
          background: ${watch.color};
        `}
      />
      <span
        css={css`
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {watch.name}
      </span>
      {lifecycle ? (
        <EuiBadge color="hollow" data-test-subj={`pndWatchesSubnavLifecycle-${watch.id}`}>
          {LIFECYCLE_LABEL[lifecycle]}
        </EuiBadge>
      ) : null}
    </NavButton>
  );
};

interface NavButtonProps {
  id: WatchesSectionId;
  path: string;
  isActive: boolean;
  children: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({ id, path, isActive, children }) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => history.push(path)}
      data-test-subj={`pndWatchesSubnav-${id}`}
      css={css`
        position: relative;
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        width: 100%;
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border: none;
        border-radius: ${euiTheme.border.radius.medium};
        background: ${isActive ? euiTheme.colors.lightShade : 'transparent'};
        color: ${isActive ? euiTheme.colors.textParagraph : euiTheme.colors.textSubdued};
        cursor: pointer;
        font-size: ${euiTheme.size.m};
        font-weight: ${isActive ? 600 : 500};
        text-align: left;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 0 2px 2px 0;
          background: ${isActive ? euiTheme.colors.primary : 'transparent'};
        }

        &:hover {
          background: ${euiTheme.colors.lightestShade};
          color: ${euiTheme.colors.textParagraph};
        }
      `}
    >
      {children}
    </button>
  );
};
