/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconResponseActionHistory: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
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
        fill="#0b64dd"
        d="M8 9h23V7H8zM11 14h7v-2h-7zM21 14h7v-2h-7zM11 19h7v-2h-7zM21 19h7v-2h-7zM11 24h7v-2h-7zM21 24h7v-2h-7z"
      />
      <path
        fill="#101c3f"
        d="M9 4h21v21.5a2.5 2.5 0 0 1-2.5 2.5H5v2h22.5a4.5 4.5 0 0 0 4.5-4.5V2H7v17h2z"
      />
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="M9 16H0v9.5a4.5 4.5 0 1 0 9 0zm-7 9.5V18h5v7.5a2.5 2.5 0 0 1-5 0"
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
        fill="#48efcf"
        d="M8 9h23V7H8zM11 14h7v-2h-7zM21 14h7v-2h-7zM11 19h7v-2h-7zM21 19h7v-2h-7zM11 24h7v-2h-7zM21 24h7v-2h-7z"
      />
      <path
        fill="#fff"
        d="M9 4h21v21.5a2.5 2.5 0 0 1-2.5 2.5H5v2h22.5a4.5 4.5 0 0 0 4.5-4.5V2H7v17h2z"
      />
      <path fill="#fff" d="M9 25.5a4.5 4.5 0 1 1-9 0V16h9zm-7 0a2.5 2.5 0 0 0 5 0V18H2z" />
    </svg>
  );

  return isDarkMode ? dark : light;
};
