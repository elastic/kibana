/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconRapidBarGraph: React.FC<SVGProps<SVGSVGElement>> = (props) => (
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
      d="M3.5 2.5V26.5C3.5 27.6044 4.3953 28.5 5.5 28.5H29.5V30H5.5C3.5667 30 2 28.4326 2 26.5V2.5H3.5Z"
      fill="#535966"
    />
    <path fillRule="evenodd" clipRule="evenodd" d="M8 25.5V18.5H9.5V25.5H8Z" fill="#535966" />
    <path fillRule="evenodd" clipRule="evenodd" d="M14 25.5V12H15.5V25.5H14Z" fill="#535966" />
    <path fillRule="evenodd" clipRule="evenodd" d="M20 25.5V16.5H21.5V25.5H20Z" fill="#535966" />
    <path fillRule="evenodd" clipRule="evenodd" d="M26 25.5V19H27.5V25.5H26Z" fill="#535966" />
    <path fillRule="evenodd" clipRule="evenodd" d="M8 16.4974V12H9.5V16.4974H8Z" fill="#00BFB3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M14 9.5V5H15.5V9.5H14Z" fill="#00BFB3" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20 13.9827V8.5H21.5V13.9827H20Z"
      fill="#00BFB3"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M26 16.4827V13H27.5V16.4827H26Z"
      fill="#00BFB3"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconRapidBarGraph;
