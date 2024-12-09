/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconReplication: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_4044_23007)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0H14V10.0035L8.70081 16H0V0ZM2 2V14H7.79919L12 9.24646V2H2Z"
        fill="#535966"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M6 8H12V10H8V14H6V8Z" fill="#535966" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 16H32V26.0035L26.7008 32H18V16ZM20 18V30H25.7992L30 25.2465V18H20Z"
        fill="#535966"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M24 24H30V26H26V30H24V24Z" fill="#535966" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 29C7.92465 29 3 24.0742 3 18H5C5 22.9698 9.02935 27 14 27H16V29H14Z"
        fill="#00BFB3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 5H16V3H18C24.0753 3 29 7.92578 29 14H27C27 9.03022 22.9706 5 18 5Z"
        fill="#00BFB3"
      />
    </g>
    <defs>
      <clipPath id="clip0_4044_23007">
        <rect width="32" height="32" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconReplication;
