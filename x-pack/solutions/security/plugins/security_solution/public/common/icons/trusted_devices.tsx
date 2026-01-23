/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconTrustedDevices: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
  const isDarkMode = useKibanaIsDarkMode();

  const light = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={16} height={16} {...props}>
      <path
        fill="#0b64dd"
        fillRule="evenodd"
        d="m9.233 5.724 8.569 6.93-2.56 1.478 1 1.732-1.733 1-1-1.732-2.56 1.478zm3.238 7.698 1.809-1.045-2.262-1.828z"
        clipRule="evenodd"
      />
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="M5 1a2 2 0 0 0-2 2v19h18v-2H5V3h22v9h2V3a2 2 0 0 0-2-2z"
        clipRule="evenodd"
      />
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="M21 20H0v1.25A4.75 4.75 0 0 0 4.75 26H21v-2H4.75a2.75 2.75 0 0 1-2.646-2H21z"
        clipRule="evenodd"
      />
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="M20 14a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3zm3-1a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V14a1 1 0 0 0-1-1z"
        clipRule="evenodd"
      />
      <path fill="#0b64dd" fillRule="evenodd" d="M22 15h8v2h-8zM25 26h2v2h-2z" clipRule="evenodd" />
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
        fill="#48efcf"
        fillRule="evenodd"
        d="m9.232 5.724 8.569 6.93-2.56 1.478 1 1.732-1.732 1-1-1.732-2.56 1.478zm3.239 7.698 1.808-1.045-2.261-1.828z"
        clipRule="evenodd"
      />
      <path fill="#fff" d="M27 1a2 2 0 0 1 2 2v9h-2V3H5v17h16v2H3V3a2 2 0 0 1 2-2z" />
      <path
        fill="#fff"
        d="M21 22H2.104a2.75 2.75 0 0 0 2.646 2H21v2H4.75A4.75 4.75 0 0 1 0 21.25V20h21z"
      />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M20 14a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3zm3-1a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V14a1 1 0 0 0-1-1z"
        clipRule="evenodd"
      />
      <path fill="#48efcf" fillRule="evenodd" d="M22 15h8v2h-8zM25 26h2v2h-2z" clipRule="evenodd" />
    </svg>
  );

  return isDarkMode ? dark : light;
};
