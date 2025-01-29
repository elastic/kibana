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
  const { euiTheme, euiVars } = useEuiTheme();
  const cached = useMemo(() => {
    const { size, border } = euiTheme;

    const controlsPanel: CSSObject = {
      paddingTop: size.s,
      paddingBottom: size.s,
      borderBottomLeftRadius: border.radius.medium,
      borderBottomRightRadius: border.radius.medium,
      backgroundColor: euiVars.terminalOutputBackground,
    };

    const controlButton: CSSObject = {
      width: size.l,
    };

    return {
      controlsPanel,
      controlButton,
    };
  }, [euiTheme, euiVars.terminalOutputBackground]);

  return cached;
};
