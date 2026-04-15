/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';

export const LoadingCursor = () => {
  return (
    <span
      css={css`
        @keyframes blink {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
        }
        display: inline-block;
        width: 10px;
        height: 16px;
        margin-left: 2px;
        vertical-align: middle;
        background: rgba(0, 0, 0, 0.25);
        animation: blink 1s infinite;
      `}
    />
  );
};
