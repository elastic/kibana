/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface ChartContainerProps {
  children: React.ReactNode;
}

/**
 * Styled container for the waffle chart.
 * Provides consistent border, padding, and minimum height.
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        height: 100%;
        min-height: 400px;
        position: relative;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        padding: ${euiTheme.size.m};
      `}
    >
      {children}
    </div>
  );
};
