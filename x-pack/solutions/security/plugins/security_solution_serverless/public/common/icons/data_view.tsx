/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconDataView: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.470703 11.6253H7.72125V30.5882H0.470703V11.6253ZM2.14391 13.2985V28.915H6.04805V13.2985H2.14391Z"
      fill="#535766"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.95221 0.470581H17.2028V30.5882H9.95221V0.470581ZM11.6254 2.14378V28.915H15.5295V2.14378H11.6254Z"
      fill="#535766"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.1069 8.27887V15.2505H19.4337V6.60566H26.6843V13.2231H25.0111V8.27887H21.1069Z"
      fill="#535766"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.4336 22.2222C19.4336 19.1419 21.9307 16.6449 25.0109 16.6449C28.0912 16.6449 30.5883 19.1419 30.5883 22.2222C30.5883 25.3025 28.0912 27.7996 25.0109 27.7996C21.9307 27.7996 19.4336 25.3025 19.4336 22.2222ZM25.0109 18.3181C22.8547 18.3181 21.1068 20.066 21.1068 22.2222C21.1068 24.3784 22.8547 26.1264 25.0109 26.1264C27.1671 26.1264 28.9151 24.3784 28.9151 22.2222C28.9151 20.066 27.1671 18.3181 25.0109 18.3181Z"
      fill="#00BFB3"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M30.1504 29.1025L27.5016 26.4537L28.6847 25.2706L31.3335 27.9193L30.1504 29.1025Z"
      fill="#00BFB3"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconDataView;
