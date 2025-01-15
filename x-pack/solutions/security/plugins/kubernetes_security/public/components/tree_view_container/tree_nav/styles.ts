/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size } = euiTheme;

    const treeViewSwitcher: CSSObject = {
      '.euiButton__text': {
        fontSize: size.m,
      },
    };

    const treeViewContainer: CSSObject = {
      height: '600px',
      width: '288px',
      overflowY: 'auto',
    };

    const treeViewLegend: CSSObject = {
      textTransform: 'capitalize',
    };

    return {
      treeViewSwitcher,
      treeViewContainer,
      treeViewLegend,
    };
  }, [euiTheme]);

  return cached;
};
