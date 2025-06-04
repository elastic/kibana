/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useButtonStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size } = euiTheme;

    const button: CSSObject = {
      lineHeight: '18px',
      height: '20px',

      marginLeft: size.xs,
      marginRight: size.xs,
      minWidth: 0,

      '&& > span': {
        padding: `0px ${size.xxs}`,
        svg: {
          transition: `transform ${euiTheme.animation.extraFast}`,
        },
      },
      '&.isExpanded > span svg:not(.alertIcon)': {
        transform: `rotate(180deg)`,
      },
    };

    const buttonArrow: CSSObject = {
      marginLeft: size.xs,
    };
    const alertButton: CSSObject = {
      ...button,

      '& .euiButton__text': {
        display: 'flex',
        alignItems: 'center',
        ' .alertIcon': {
          marginLeft: '4px',
        },
      },
    };

    const outputButton: CSSObject = {
      ...button,
    };

    const userChangedButton: CSSObject = {
      ...button,
    };

    const buttonSize: CSSObject = {
      padding: `0px ${euiTheme.size.xs}`,
    };

    return {
      buttonArrow,
      button,
      alertButton,
      outputButton,
      userChangedButton,
      buttonSize,
    };
  }, [euiTheme]);

  return cached;
};
