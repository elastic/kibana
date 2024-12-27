/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const descriptionList: CSSObject = {
      padding: `${euiTheme.size.base} ${euiTheme.size.s} `,
      alignItems: 'flex-start',
      rowGap: 0,
    };

    const tabListTitle = {
      display: 'flex',
    };

    const tabListDescription = {
      display: 'flex',
    };

    return {
      descriptionList,
      tabListTitle,
      tabListDescription,
    };
  }, [euiTheme]);

  return cached;
};
