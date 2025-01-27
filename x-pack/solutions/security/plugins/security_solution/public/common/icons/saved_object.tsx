/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconSavedObject: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1334_337834)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.0002 0V9.92L11.6252 7.219L10.3752 8.781L16.0002 13.28L21.6252 8.781L20.3752 7.219L17.0002 9.92V0H15.0002Z"
          fill="#00BFB3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M19.9468 1.83246L29.1968 8.00046L15.9998 16.7975L2.80276 8.00046L12.0548 1.83246L10.9448 0.168457L-0.000244141 7.46446V20.5355L15.9998 31.2025L32.0008 20.5355V7.46446L21.0558 0.168457L19.9468 1.83246ZM16.9998 18.5355L29.9998 9.86846V19.4655L16.9998 28.1305V18.5355ZM1.99976 19.4655V9.86846L15.0008 18.5355V28.1305L1.99976 19.4655Z"
          fill="#535766"
        />
      </g>
      <defs>
        <clipPath id="clip0_1334_337834">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </svg>
);
