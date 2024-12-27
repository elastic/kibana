/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const cached = useMemo(() => {
    const filterStatus: CSSObject = {
      paddingLeft: '16px',
      '& .text': {
        fontWeight: 600,
      },
    };

    const popover: CSSObject = {
      paddingRight: '16px',
      '&  .filterMenu': {
        width: '180px',
      },
    };

    return {
      filterStatus,
      popover,
    };
  }, []);

  return cached;
};
