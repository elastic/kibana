/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconEndpointExceptions: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
  const isDarkMode = useKibanaIsDarkMode();

  const light = (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 32 32" {...props}>
      <path
        fill="#101c3f"
        d="M1 4.693C1 .928 5.896-.425 7.745 2.856l7.403 13.147-.277.49-7.126 12.655C5.897 32.43 1 31.078 1 27.313zm5.002-.857C5.172 2.364 3 2.964 3 4.69v22.62c0 1.727 2.173 2.326 3.002.854L12.852 16z"
      />
      <path
        fill="#0b64dd"
        d="M18.624 1a6.26 6.26 0 0 1 5.28 2.882L30.323 14h-2.368l-5.74-9.044A4.26 4.26 0 0 0 18.624 3h-5.235l6.029 11h-2.28L10.011 1z"
      />
      <path
        fill="#101c3f"
        d="M29 24a6 6 0 1 0-6 6v2a8 8 0 1 1 0-16 8 8 0 0 1 0 16v-2a6 6 0 0 0 6-6"
      />
      <path fill="#101c3f" d="M19 23h8v2h-8z" />
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
        d="M1 4.69C1 .926 5.896-.426 7.745 2.855L15.148 16l-.277.49-7.126 12.656C5.897 32.427 1 31.076 1 27.31zm5.002-.855C5.172 2.364 3 2.965 3 4.691V27.31c0 1.727 2.173 2.326 3.002.854L12.852 16z"
      />
      <path
        fill="#48efcf"
        d="M18.624 1a6.26 6.26 0 0 1 5.279 2.882L30.323 14h-2.367l-5.74-9.044A4.26 4.26 0 0 0 18.624 3h-5.235l6.029 11h-2.28L10.011 1z"
      />
      <path fill="#fff" d="M29 24a6 6 0 1 0-6 6v2a8 8 0 1 1 0-16 8 8 0 0 1 0 16v-2a6 6 0 0 0 6-6" />
      <path fill="#101c3f" stroke="#fff" d="M19.5 23.5h7v1h-7z" />
    </svg>
  );

  return isDarkMode ? dark : light;
};
