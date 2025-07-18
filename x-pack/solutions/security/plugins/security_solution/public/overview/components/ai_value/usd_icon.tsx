/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const UsdIcon = (props: EuiIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <text
      x="8"
      y="12"
      textAnchor="middle"
      fontSize="12"
      fontFamily="Arial, sans-serif"
      dominantBaseline="middle"
    >
      $
    </text>
  </svg>
);
