/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import React from 'react';

const pulseGlow = keyframes`
  0%, 100% {
    text-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
    opacity: 1;
  }
  50% {
    text-shadow: 0 0 16px currentColor, 0 0 32px currentColor;
    opacity: 0.8;
  }
`;

interface PulsingTitleProps {
  children: React.ReactNode;
}

export const PulsingTitle: React.FC<PulsingTitleProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        animation: ${pulseGlow} 2s ease-in-out infinite;
        color: ${euiTheme.colors.primary};
      `}
    >
      {children}
    </span>
  );
};
