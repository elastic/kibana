/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconScriptLibrary: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  const isDarkMode = useKibanaIsDarkMode();
  const { height, ...rest } = props;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      width="100%"
      height={height ?? 32}
      viewBox="0 0 24 24"
      {...rest}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M19.84 1.84c-.19.19-.35.53-.35 1.16v18c0 .87-.21 1.65-.78 2.22-.56.56-1.35.78-2.22.78h-.75v-1.5h.75c.64 0 .98-.16 1.16-.34.19-.19.34-.53.34-1.16V3c0-.87.22-1.65.79-2.22A3 3 0 0 1 20.99 0v1.5c-.63 0-.97.16-1.15.34"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 18.75h15V21c0 .63.15.97.34 1.16.18.18.52.34 1.15.34V24H3c-.86 0-1.65-.22-2.22-.78A3 3 0 0 1 0 21zm13.78 3.75q-.3-.68-.29-1.5v-.75H1.5V21c0 .64.15.97.34 1.16.18.18.52.34 1.15.34zM3 3c0-1.73 1.27-3 3-3h14.9c.9 0 1.7.21 2.28.77.59.57.8 1.36.8 2.23v2.25h-5.62v-1.5h4.12V3c0-.63-.15-.97-.34-1.15-.2-.19-.55-.35-1.24-.35H5.99c-.9 0-1.5.6-1.5 1.5v15.75H3z"
        clipRule="evenodd"
      />
      <path
        fill={isDarkMode ? '#48efcf' : '#0b64dd'}
        fillRule="evenodd"
        d="m14.02 8.47-1.06 1.06 1.72 1.72-1.72 1.72 1.06 1.06 2.78-2.78zm-5.93 0 1.06 1.06-1.72 1.72 1.72 1.72-1.06 1.06-2.78-2.78zm1.3 6.35 1.87-7.5 1.46.36-1.88 7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
};
