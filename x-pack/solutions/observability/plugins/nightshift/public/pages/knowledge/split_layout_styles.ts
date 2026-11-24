/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';

export const getSplitLayoutStyles = (isMobile: boolean) => ({
  group: isMobile
    ? css`
        height: auto;
      `
    : css`
        min-height: 520px;
        height: calc(100vh - 220px);
      `,
  sidebarItem: css`
    width: ${isMobile ? '100%' : '280px'};
  `,
  sidebarPanel: css`
    height: ${isMobile ? '320px' : '100%'};
    min-height: 0;
    overflow: hidden;
  `,
  contentPanel: css`
    height: ${isMobile ? '70vh' : '100%'};
    min-height: 0;
    overflow: hidden;
  `,
});
