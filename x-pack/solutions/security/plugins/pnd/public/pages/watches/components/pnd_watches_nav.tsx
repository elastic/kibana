/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { PND_WATCHES_SUBNAV_WIDTH } from '../../../components/layout/constants';
import * as i18n from '../translations';

export type WatchesSectionId =
  | 'watches'
  | 'workflows'
  | 'skills'
  | 'activity'
  | 'performance'
  | 'guardrails';

interface NavItem {
  id: WatchesSectionId;
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'watches', label: i18n.SUBNAV_WATCHES, path: '/watches', icon: 'eye' },
  { id: 'workflows', label: i18n.SUBNAV_WORKFLOWS, path: '/watches/workflows', icon: 'branch' },
  { id: 'skills', label: i18n.SUBNAV_SKILLS, path: '/watches/skills', icon: 'nested' },
  { id: 'activity', label: i18n.SUBNAV_ACTIVITY, path: '/watches/activity', icon: 'stats' },
  {
    id: 'performance',
    label: i18n.SUBNAV_PERFORMANCE,
    path: '/watches/performance',
    icon: 'visLine',
  },
  {
    id: 'guardrails',
    label: i18n.SUBNAV_GUARDRAILS,
    path: '/watches/guardrails',
    icon: 'lock',
  },
];

interface PndWatchesNavProps {
  active: WatchesSectionId;
  onCollapse: () => void;
}

export const PndWatchesNav: React.FC<PndWatchesNavProps> = ({ active, onCollapse }) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();

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
          <EuiButtonIcon
            iconType="menuLeft"
            aria-label={i18n.SUBNAV_COLLAPSE}
            color="text"
            display="base"
            data-test-subj="pndWatchesSubnavCollapse"
            onClick={onCollapse}
          />
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
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <EuiFlexItem key={item.id} grow={false}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => history.push(item.path)}
                data-test-subj={`pndWatchesSubnav-${item.id}`}
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
                <EuiIcon type={item.icon} size="m" />
                <span>{item.label}</span>
              </button>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </aside>
  );
};
