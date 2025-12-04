/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconEndpoints: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
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
      d="m7.745 2.856 7.403 13.147-.277.49-7.126 12.655C5.896 32.43 1 31.078 1 27.312V4.693C1 .927 5.896-.425 7.745 2.856M3 27.31c0 1.727 2.173 2.327 3.002.854L12.852 16 6.002 3.835C5.173 2.363 3 2.964 3 4.69zM10.012 31l7.675-14h12.795l-.893 1.51-5.686 9.608A6.26 6.26 0 0 1 18.623 31zM22.2 27.07 26.975 19h-8.104L13.39 29h5.235c1.46 0 2.816-.74 3.575-1.93"
      clipRule="evenodd"
    />
    <path
      fill="#0b64dd"
      fillRule="evenodd"
      d="M17.137 14 10.012 1h8.612a6.26 6.26 0 0 1 5.28 2.882L30.323 14h-2.369l-5.74-9.044A4.26 4.26 0 0 0 18.624 3h-5.235l6.029 11z"
      clipRule="evenodd"
    />
  </svg>
);
