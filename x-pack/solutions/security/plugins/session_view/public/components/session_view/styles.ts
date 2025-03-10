/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

interface StylesDeps {
  height?: number;
  isFullScreen?: boolean;
}

export const useStyles = ({ height = 500, isFullScreen }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { border, size } = euiTheme;

    // 118px = Session View Toolbar height + Close Session button height + spacing margin at the bottom
    const sessionView: CSSObject = {
      height: `${isFullScreen ? 'calc(100vh - 118px)' : height + 'px'}`,
    };

    const processTree: CSSObject = {
      ...sessionView,
      position: 'relative',
    };

    const detailPanel: CSSObject = {
      ...sessionView,
      borderRightWidth: '0px',
    };

    const resizeHandle: CSSObject = {
      zIndex: 2,
    };

    const nonGrowGroup: CSSObject = {
      display: 'flex',
      flexGrow: 0,
      alignItems: 'stretch',
    };

    const sessionViewerComponent: CSSObject = {
      position: 'relative',
      border: border.thin,
      borderRadius: border.radius.medium,
      '> .sessionViewerToolbar': {
        backgroundColor: `${euiTheme.components.forms.backgroundDisabled}`,
        padding: `${size.m} ${size.base}`,
      },
    };

    const fakeDisabled: CSSObject = {
      color: euiTheme.colors.disabled,
    };

    return {
      processTree,
      detailPanel,
      nonGrowGroup,
      resizeHandle,
      fakeDisabled,
      sessionViewerComponent,
    };
  }, [euiTheme, isFullScreen, height]);

  return cached;
};
