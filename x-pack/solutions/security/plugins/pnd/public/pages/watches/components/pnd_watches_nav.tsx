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
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import {
  compareWatchesForDisplay,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
  type Watch,
} from '@kbn/pnd-common';
import { PND_WATCHES_SUBNAV_WIDTH } from '../../../components/layout/constants';
import * as i18n from '../translations';

export type WatchesSectionId = 'watches' | 'workers' | 'skills';

interface TopNavItem {
  id: Exclude<WatchesSectionId, 'watches'>;
  label: string;
  path: string;
}

const TOP_NAV_ITEMS: TopNavItem[] = [
  { id: 'workers', label: i18n.SUBNAV_WORKERS, path: '/watches/workers' },
  { id: 'skills', label: i18n.SUBNAV_SKILLS, path: '/watches/skills' },
];

const isBetaWatch = (watch: Watch): boolean =>
  watch.tags.includes(WATCH_DARK_TAG) || watch.tags.includes(WATCH_DEEP_TAG);

interface PndWatchesNavProps {
  active: WatchesSectionId;
  activeWatchId?: string;
  onCollapse: () => void;
  watches: Watch[];
  setupFailed: string[];
  isLoading: boolean;
}

export const PndWatchesNav: React.FC<PndWatchesNavProps> = ({
  active,
  activeWatchId,
  onCollapse,
  watches: unsortedWatches,
  setupFailed,
  isLoading,
}) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const watches = useMemo(() => {
    return [...unsortedWatches].sort(compareWatchesForDisplay);
  }, [unsortedWatches]);

  const navButtonCss = (isActive: boolean) => css`
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
  `;

  return (
    <nav
      aria-label={i18n.SUBNAV_ARIA_LABEL}
      data-test-subj="pndWatchesSubnav"
      css={css`
        width: ${PND_WATCHES_SUBNAV_WIDTH}px;
        flex-shrink: 0;
        height: 100%;
        padding: ${euiTheme.size.m};
        border-right: 1px solid ${euiTheme.border.color};
        background: ${euiTheme.colors.emptyShade};
        overflow: auto;
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

      {setupFailed.length ? (
        <EuiCallOut
          announceOnMount
          css={css`
            margin-top: ${euiTheme.size.m};
          `}
          color="warning"
          iconType="warning"
          size="s"
          title={i18n.watchSetupFailed(setupFailed)}
        />
      ) : null}

      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-top: ${euiTheme.size.m};
          margin-bottom: ${euiTheme.size.xs};
          padding-left: ${euiTheme.size.s};
          text-transform: uppercase;
          letter-spacing: 0.04em;
        `}
      >
        <p>{i18n.SUBNAV_WATCHES}</p>
      </EuiText>

      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        {isLoading && watches.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" css={{ padding: euiTheme.size.m }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {watches.map((watch) => {
          const isActive = active === 'watches' && activeWatchId === watch.id;
          return (
            <EuiFlexItem key={watch.id} grow={false}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => history.push(`/watches/${watch.id}`)}
                data-test-subj={`pndWatchesSubnav-watch-${watch.id}`}
                css={navButtonCss(isActive)}
              >
                <span
                  aria-hidden="true"
                  css={css`
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
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
                {isBetaWatch(watch) ? (
                  <EuiBadge color="hollow" css={{ flexShrink: 0 }}>
                    {i18n.BETA_BADGE}
                  </EuiBadge>
                ) : null}
              </button>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        responsive={false}
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        {TOP_NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <EuiFlexItem key={item.id} grow={false}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => history.push(item.path)}
                data-test-subj={`pndWatchesSubnav-${item.id}`}
                css={navButtonCss(isActive)}
              >
                <span>{item.label}</span>
              </button>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </nav>
  );
};
