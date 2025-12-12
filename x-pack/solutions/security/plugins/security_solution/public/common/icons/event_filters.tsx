/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconEventFilters: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
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
      <g clipPath="url(#a)">
        <path
          fill="#101c3f"
          d="M30 26.263v3.474a.263.263 0 0 1-.263.263h-9.474a.263.263 0 0 1-.263-.263v-9.474c0-.145.118-.263.263-.263h8.526v-2h-8.526A2.263 2.263 0 0 0 18 20.263v9.474A2.263 2.263 0 0 0 20.263 32h9.474A2.263 2.263 0 0 0 32 29.737v-3.474z"
        />
        <path
          fill="#101c3f"
          fillRule="evenodd"
          d="M14 20a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2zM2 30V20h10v10zM32 2a2 2 0 0 0-2-2H20a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2zM20 12V2h10v10z"
          clipRule="evenodd"
        />
        <path
          fill="#101c3f"
          d="M12 8.263v3.474a.263.263 0 0 1-.263.263H2.263A.263.263 0 0 1 2 11.737V2.263C2 2.118 2.118 2 2.263 2h8.527V0H2.263A2.263 2.263 0 0 0 0 2.263v9.474A2.263 2.263 0 0 0 2.263 14h9.474A2.263 2.263 0 0 0 14 11.737V8.263z"
        />
        <path
          fill="#0b64dd"
          d="M4.707 5.293 3.293 6.707 7 10.414l6.707-6.707-1.414-1.414L7 7.586zM22.707 23.293l-1.414 1.414L25 28.414l6.707-6.707-1.414-1.414L25 25.586z"
        />
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
          fill="#fff"
          d="M30 26.263v3.474a.263.263 0 0 1-.263.263h-9.474a.263.263 0 0 1-.263-.263v-9.474c0-.145.118-.263.263-.263h8.526v-2h-8.526A2.263 2.263 0 0 0 18 20.263v9.474A2.263 2.263 0 0 0 20.263 32h9.474A2.263 2.263 0 0 0 32 29.737v-3.474zM12 18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V20a2 2 0 0 1 2-2zM2 30h10V20H2zM30 0a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM20 12h10V2H20zM12 8.263v3.474a.263.263 0 0 1-.263.263H2.263A.263.263 0 0 1 2 11.737V2.263C2 2.118 2.118 2 2.263 2h8.527V0H2.263A2.263 2.263 0 0 0 0 2.263v9.474A2.263 2.263 0 0 0 2.263 14h9.474A2.263 2.263 0 0 0 14 11.737V8.263z"
        />
        <path
          fill="#48efcf"
          d="M4.707 5.293 3.293 6.707 7 10.414l6.707-6.707-1.414-1.414L7 7.586zM22.707 23.293l-1.414 1.414L25 28.414l6.707-6.707-1.414-1.414L25 25.586z"
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
