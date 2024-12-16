/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { euiLightVars } from '@kbn/ui-theme';
import { useEuiTheme } from '../../hooks';

interface StylesDeps {
  isDisplayedAbove: boolean;
}

export const useStyles = ({ isDisplayedAbove }: StylesDeps) => {
  const { euiTheme, euiVars } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, font } = euiTheme;

    const buttonStyle = {
      color: euiLightVars.euiColorEmptyShade,
      backgroundColor: euiLightVars.euiColorPrimaryText,
    };

    const container: CSSObject = {
      position: 'absolute',
      height: size.xxxxl,
      width: '100%',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const jumpBackBadge: CSSObject = {
      position: 'sticky',
      pointerEvents: 'auto',
      cursor: 'pointer',
      fontWeight: font.weight.regular,
    };

    if (isDisplayedAbove) {
      container.top = 0;
      container.background = `linear-gradient(180deg, ${euiVars.euiColorLightestShade} 0%, transparent 100%)`;
    } else {
      container.bottom = 0;
      container.background = `linear-gradient(360deg, ${euiVars.euiColorLightestShade} 0%, transparent 100%)`;
    }

    return {
      container,
      jumpBackBadge,
      buttonStyle,
    };
  }, [isDisplayedAbove, euiTheme, euiVars]);

  return cached;
};
