/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import { euiCanAnimate } from '@elastic/eui';

const iconPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.8; }
`;

const breathe = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

/** Animations only apply when the user has not asked for reduced motion. */
export const iconPulseStyles = css`
  display: inline-flex;
  ${euiCanAnimate} {
    animation: ${iconPulse} 3.5s ease-in-out infinite;
  }
`;

export const labelGlowStyles = css`
  ${euiCanAnimate} {
    animation: ${breathe} 3s ease-in-out infinite;
  }
`;
