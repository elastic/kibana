/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';

// width of the illustration used in the empty states
const DEFAULT_ILLUSTRATION_WIDTH = 360;

/**
 * A container component that maintains a fixed width for SVG elements,
 * this prevents the EmptyState component from flickering while the SVGs are loading.
 */
export const EmptyStateIllustrationContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    css={css`
      width: ${DEFAULT_ILLUSTRATION_WIDTH}px;
    `}
  >
    {children}
  </div>
);
