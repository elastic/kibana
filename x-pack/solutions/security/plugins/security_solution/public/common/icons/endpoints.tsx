/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconEndpoints: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
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
      <path
        fill="#fff"
        d="m30.482 17-.893 1.509-5.686 9.61A6.26 6.26 0 0 1 18.623 31h-8.61l7.674-14zM18.87 19l-5.482 10h5.235c1.46 0 2.816-.74 3.575-1.929L26.975 19z"
      />
    </svg>
  );

  return isDarkMode ? dark : light;
};
