/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { PndWatchesNav, type WatchesSectionId } from './pnd_watches_nav';
import * as i18n from '../translations';

const SUBNAV_COLLAPSED_KEY = 'pnd.watches.subnavCollapsed';

const readCollapsed = (): boolean => {
  try {
    return window.sessionStorage.getItem(SUBNAV_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

interface WatchesSubnavContextValue {
  isCollapsed: boolean;
  expand: () => void;
  collapse: () => void;
}

const WatchesSubnavContext = createContext<WatchesSubnavContextValue | null>(null);

export const useWatchesSubnav = (): WatchesSubnavContextValue => {
  const value = useContext(WatchesSubnavContext);
  if (!value) {
    throw new Error('useWatchesSubnav must be used within WatchesSectionLayout');
  }
  return value;
};

/** Inline expand control for page headers when the Watches subnav is collapsed. */
export const WatchesSubnavExpandControl: React.FC = () => {
  const { isCollapsed, expand } = useWatchesSubnav();

  if (!isCollapsed) {
    return null;
  }

  return (
    <EuiButtonIcon
      iconType="menuRight"
      aria-label={i18n.SUBNAV_EXPAND}
      color="text"
      display="base"
      data-test-subj="pndWatchesSubnavExpand"
      onClick={expand}
    />
  );
};

interface WatchesSectionLayoutProps {
  active: WatchesSectionId;
  children: React.ReactNode;
}

export const WatchesSectionLayout: React.FC<WatchesSectionLayoutProps> = ({ active, children }) => {
  const { euiTheme } = useEuiTheme();
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const setCollapsed = useCallback((next: boolean) => {
    setIsCollapsed(next);
    try {
      window.sessionStorage.setItem(SUBNAV_COLLAPSED_KEY, String(next));
    } catch {
      // sessionStorage may be unavailable
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      isCollapsed,
      expand: () => setCollapsed(false),
      collapse: () => setCollapsed(true),
    }),
    [isCollapsed, setCollapsed]
  );

  return (
    <WatchesSubnavContext.Provider value={contextValue}>
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        css={css`
          flex: 1;
          min-height: 0;
          height: 100%;
        `}
      >
        {!isCollapsed ? (
          <EuiFlexItem grow={false}>
            <PndWatchesNav active={active} onCollapse={() => setCollapsed(true)} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem
          css={css`
            min-width: 0;
            min-height: 0;
            overflow: auto;
            background: ${euiTheme.colors.body};
          `}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </WatchesSubnavContext.Provider>
  );
};
