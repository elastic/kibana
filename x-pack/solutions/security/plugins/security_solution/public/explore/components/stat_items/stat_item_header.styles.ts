/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const useStyles = () => {
  return {
    container: css`
      .no-margin {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }
    `,
    title: css`
      line-height: 200%;
    `,
  };
};
