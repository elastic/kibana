/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

interface AnomaliesBorderedVisPanelProps {
  children: React.ReactNode;
  heightPx?: number;
  centerContent?: boolean;
}

export const AnomaliesBorderedVisPanel: React.FC<AnomaliesBorderedVisPanelProps> = ({
  children,
  heightPx,
  centerContent = false,
}) => (
  <EuiPanel
    color="plain"
    hasBorder
    paddingSize="none"
    css={css`
      padding: 16px 24px;
      ${heightPx !== undefined ? `height: ${heightPx}px;` : ''}
      ${centerContent
        ? `
          display: flex;
          align-items: center;
          justify-content: center;
        `
        : ''}
    `}
  >
    {children}
  </EuiPanel>
);
