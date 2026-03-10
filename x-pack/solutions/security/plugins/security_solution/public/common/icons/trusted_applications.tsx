/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconTrustedApplications: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
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
      <g fillRule="evenodd" clipPath="url(#a)" clipRule="evenodd">
        <path fill="#0b64dd" d="M27 7.961H2v-2h25zM6.001 5h-2V3h2zM10.001 5h-2V3h2z" />
        <path
          fill="#101c3f"
          d="M2.001 0a2 2 0 0 0-2 2v19.037a2 2 0 0 0 2.003 2L18 23.014v-2l-16 .023V2h25v7h2V2a2 2 0 0 0-2-2z"
        />
        <path
          fill="#101c3f"
          d="M29.001 11h-8a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1m-8-2a3 3 0 0 0-3 3v17a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3z"
        />
        <path fill="#0b64dd" d="M20.001 14.039h10v2h-10zM26.001 28.961h-2v-2h2z" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h32v32H0z" />
        </clipPath>
      </defs>
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
      <g clipPath="url(#a)">
        <path
          fill="#48efcf"
          fillRule="evenodd"
          d="M27 7.962H2v-2h25zM6 5H4V3h2zM10 5H8V3h2z"
          clipRule="evenodd"
        />
        <path
          fill="#fff"
          d="M27 0a2 2 0 0 1 2 2v7h-2V2H2v19.037l16-.023v2l-15.996.023a2 2 0 0 1-2.003-2V2a2 2 0 0 1 2-2z"
        />
        <path
          fill="#fff"
          fillRule="evenodd"
          d="M29 11h-8a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1m-8-2a3 3 0 0 0-3 3v17a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3z"
          clipRule="evenodd"
        />
        <path
          fill="#48efcf"
          fillRule="evenodd"
          d="M20 14.038h10v2H20zM26.001 28.962h-2v-2h2z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h32v32H0z" />
        </clipPath>
      </defs>
    </svg>
  );

  return isDarkMode ? dark : light;
};
