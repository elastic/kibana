/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconInfra: React.FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_4044_22869)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 14H32V32H9V14ZM11 16V30H30V16H11Z"
        fill="#535966"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M31 24H10V22H31V24Z" fill="#535966" />
      <path fillRule="evenodd" clipRule="evenodd" d="M17 20H13V18H17V20Z" fill="#00BFB3" />
      <path fillRule="evenodd" clipRule="evenodd" d="M17 28H13V26H17V28Z" fill="#00BFB3" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.62311 7.96014C6.26408 3.46188 10.1221 0 14.8 0C19.4791 0 23.3361 3.46211 23.9778 7.96028C25.9375 8.72369 27.5578 10.1658 28.5476 11.9999H26.1676C25.3118 10.9 24.1262 10.0685 22.7605 9.65388L22.1015 9.45383L22.0534 8.76683C21.7887 4.98508 18.6462 2 14.8 2C10.9547 2 7.8114 4.98516 7.54758 8.7666L7.49962 9.45401L6.84019 9.65397C4.03728 10.5039 2 13.1044 2 16.18C2 19.3164 4.11694 21.9582 7 22.7545V24.812C3.00198 23.9734 0 20.4274 0 16.18C0 12.435 2.33352 9.24079 5.62311 7.96014ZM27.2444 13.9999C27.275 14.0908 27.3038 14.1825 27.3307 14.275L28.2775 13.9999H27.2444Z"
        fill="#535966"
      />
    </g>
    <defs>
      <clipPath id="clip0_4044_22869">
        <rect width="32" height="32" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconInfra;
