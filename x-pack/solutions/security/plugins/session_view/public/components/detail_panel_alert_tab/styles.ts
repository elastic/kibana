/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, size } = euiTheme;

    const container: CSSObject = {
      position: 'relative',
    };

    const stickyItem: CSSObject = {
      position: 'sticky',
      top: 0,
      zIndex: 1,
      backgroundColor: colors.emptyShade,
    };

    const viewMode: CSSObject = {
      margin: size.base,
    };

    const loadMoreBtn: CSSObject = {
      margin: size.m,
      width: `calc(100% - ${size.m} * 2)`,
    };

    return {
      container,
      stickyItem,
      viewMode,
      loadMoreBtn,
    };
  }, [euiTheme]);

  return cached;
};
