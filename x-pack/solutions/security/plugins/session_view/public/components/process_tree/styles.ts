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
    const { font } = euiTheme;

    const sessionViewProcessTree: CSSObject = {
      position: 'relative',
      fontFamily: font.familyCode,
      overflow: 'auto',
      height: '100%',
      backgroundColor: euiVars.euiColorLightestShade,
    };

    return {
      sessionViewProcessTree,
    };
  }, [euiTheme, euiVars]);

  return cached;
};
