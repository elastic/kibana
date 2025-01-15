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
    const { border } = euiTheme;

    const wrapper: CSSObject = {
      display: 'flex',
      alignItems: 'center',
    };

    const dottedLine: CSSObject = {
      flex: 1,
      borderTop: `${border.width.thick} dotted ${border.color}`,
    };

    return {
      wrapper,
      dottedLine,
    };
  }, [euiTheme]);

  return cached;
};
