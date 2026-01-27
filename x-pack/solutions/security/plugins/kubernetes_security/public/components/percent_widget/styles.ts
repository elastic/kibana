/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors, font, border } = euiTheme;

    const container: CSSObject = {
      padding: size.base,
      border: border.thin,
      borderRadius: border.radius.medium,
      overflow: 'auto',
      position: 'relative',
    };

    const title: CSSObject = {
      marginBottom: size.m,
    };

    const dataInfo: CSSObject = {
      marginBottom: size.xs,
      display: 'flex',
      alignItems: 'center',
      height: '18px',
    };

    const dataValue: CSSObject = {
      fontWeight: font.weight.semiBold,
      marginLeft: 'auto',
    };

    const filters: CSSObject = {
      marginLeft: size.s,
    };

    const percentageBackground: CSSObject = {
      position: 'relative',
      backgroundColor: colors.lightShade,
      height: size.xs,
      borderRadius: border.radius.small,
    };

    const percentageBar: CSSObject = {
      position: 'absolute',
      height: size.xs,
      borderRadius: border.radius.small,
    };

    const loadingSpinner: CSSObject = {
      alignItems: 'center',
      margin: `${size.xs} auto ${size.xl} auto`,
    };

    return {
      container,
      title,
      dataInfo,
      dataValue,
      filters,
      percentageBackground,
      percentageBar,
      loadingSpinner,
    };
  }, [euiTheme]);

  return cached;
};
