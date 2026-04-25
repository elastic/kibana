/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconBlocklist: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
  const isDarkMode = useKibanaIsDarkMode();

  const light = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 32 32"
      width={16}
      height={16}
      {...props}
    >
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="M4 6.816v5.255c0 7.864 4.697 14.798 12 17.77 7.303-2.972 12-9.906 12-17.77V6.816L16 2.201zm12 25.171-.359-.138C7.354 28.662 2 20.9 2 12.071V5.443L16 .058l14 5.385v6.628c0 8.827-5.354 16.591-13.641 19.778z"
        clipRule="evenodd"
      />
      <path
        fill="#0b64dd"
        fillRule="evenodd"
        d="M11 23h2v-5h-2zM12 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2m1-3.815V7h-2v3.185A2.995 2.995 0 0 0 9 13c0 1.654 1.346 3 3 3s3-1.346 3-3a2.995 2.995 0 0 0-2-2.815M19 12h2V7h-2zM20 18a1 1 0 1 1 0-2 1 1 0 0 1 0 2m3-1c0-1.654-1.346-3-3-3s-3 1.346-3 3c0 1.302.839 2.401 2 2.815V23h2v-3.185A2.995 2.995 0 0 0 23 17"
        clipRule="evenodd"
      />
    </svg>
  );

  const dark = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      fill="none"
      viewBox="0 0 32 32"
      {...props}
    >
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M4 6.816v5.255c0 7.864 4.697 14.798 12 17.77 7.303-2.972 12-9.906 12-17.77V6.816L16 2.201zm12 25.171-.359-.138C7.354 28.662 2 20.9 2 12.071V5.443L16 .058l14 5.385v6.628c0 8.827-5.354 16.591-13.641 19.778z"
        clipRule="evenodd"
      />
      <path
        fill="#48efcf"
        fillRule="evenodd"
        d="M11 23h2v-5h-2zM12 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2m1-3.815V7h-2v3.185A2.995 2.995 0 0 0 9 13c0 1.654 1.346 3 3 3s3-1.346 3-3a2.995 2.995 0 0 0-2-2.815M19 12h2V7h-2zM20 18a1 1 0 1 1 0-2 1 1 0 0 1 0 2m3-1c0-1.654-1.346-3-3-3s-3 1.346-3 3c0 1.302.839 2.401 2 2.815V23h2v-3.185A2.995 2.995 0 0 0 23 17"
        clipRule="evenodd"
      />
    </svg>
  );

  return isDarkMode ? dark : light;
};
