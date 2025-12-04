/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconPolicies: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
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
      d="M1 0h19a7 7 0 0 1 6.326 4H29a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-2v12a7 7 0 0 1-7 7H1zm24 13V7a5 5 0 0 0-5-5H3v28h17a5 5 0 0 0 5-5zm2-2h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2v5m2 4v6h2v-6zm0 9v6h2v-6z"
      clipRule="evenodd"
    />
    <path
      fill="#0b64dd"
      fillRule="evenodd"
      d="M7 9h3V7H7zm5 0h9V7h-9zm0 6h9v-2h-9zm9 6h-9v-2h9zm-9 5.5h9v-2h-9zM10 15H7v-2h3zm-3 6h3v-2H7zm3 5.5H7v-2h3z"
      clipRule="evenodd"
    />
  </svg>
);
