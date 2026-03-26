/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconHostIsolationExceptions: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
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
        d="M12 23.989V23h2v.989A6 6 0 0 1 12.463 28h7.075A6 6 0 0 1 18 23.989V23h2v.989a4 4 0 0 0 1.23 2.886L24.486 30H7.515l3.255-3.125A4 4 0 0 0 12 23.989"
        clipRule="evenodd"
      />
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="M3 3H2v21h18v-2H4V5h24v8h2V3H3"
        clipRule="evenodd"
      />
      <path
        fill="#101c3f"
        fillRule="evenodd"
        d="m24.526 13.273 5.426 2.087v2.774a7.88 7.88 0 0 1-5.048 7.351l-.004.001-.376.143-.375-.144a7.88 7.88 0 0 1-5.05-7.35V15.36zm-3.426 3.46v1.401a5.88 5.88 0 0 0 3.426 5.341 5.88 5.88 0 0 0 3.426-5.34v-1.402l-3.426-1.317z"
        clipRule="evenodd"
      />
      <path stroke="#0b64dd" strokeWidth="2" d="M8 17h7M8 13h10M8 9h16" />
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
        d="M12 23.989V23h2v.989A6 6 0 0 1 12.462 28h7.076A6 6 0 0 1 18 23.989V23h2v.989a4 4 0 0 0 1.23 2.886L24.486 30H7.514l3.256-3.125A4 4 0 0 0 12 23.989"
        clipRule="evenodd"
      />
      <path fill="#fff" d="M30 13h-2V5H4v17h16v2H2V3h28z" />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="m24.525 13.273 5.427 2.087v2.774a7.88 7.88 0 0 1-5.049 7.351l-.003.001-.376.143-.376-.144a7.88 7.88 0 0 1-5.049-7.35V15.36zm-3.426 3.46v1.401a5.88 5.88 0 0 0 3.427 5.341 5.88 5.88 0 0 0 3.426-5.34v-1.402l-3.427-1.317z"
        clipRule="evenodd"
      />
      <path
        fill="#48efcf"
        fillRule="evenodd"
        d="M15 18H8v-2h7zM18 14H8v-2h10zM24 10H8V8h16z"
        clipRule="evenodd"
      />
    </svg>
  );

  return isDarkMode ? dark : light;
};
