/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const cached = useMemo(() => {
    const { size, colors, border } = euiTheme;

    const ratio: CSSObject = {
      fontSize: size.m,
      color: colors.ghost,
    };

    const separator: CSSObject = {
      background: colors.lightShade,
      height: size.xl,
      width: border.width.thin,
    };

    return {
      ratio,
      separator,
    };
  }, [euiTheme]);

  return cached;
};
