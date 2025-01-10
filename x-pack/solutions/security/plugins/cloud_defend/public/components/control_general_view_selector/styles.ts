/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CSSObject } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { size, border } = euiTheme;

  return useMemo(() => {
    const accordion: CSSObject = {
      borderRadius: border.radius.medium,
      border: border.thin,
      '> .euiAccordion__triggerWrapper': {
        padding: size.m,
      },
    };

    const conditionsBadge: CSSObject = {
      display: 'inline',
    };

    const verticalDivider: CSSObject = {
      display: 'inline-block',
      verticalAlign: 'middle',
      width: '1px',
      height: '20px',
      border: border.thin,
      borderRight: 0,
      borderTop: 0,
      borderBottom: 0,
      marginLeft: size.base,
      marginRight: size.base,
    };

    return { accordion, conditionsBadge, verticalDivider };
  }, [border.radius.medium, border.thin, size.base, size.m]);
};
