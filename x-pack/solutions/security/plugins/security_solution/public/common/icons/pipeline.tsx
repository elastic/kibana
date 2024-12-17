/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconPipeline: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M30 23H29C28.449 23 28 22.552 28 22V14C28 13.448 28.449 13 29 13H30V23ZM20 20V22C20 22.552 19.551 23 19 23H13C12.449 23 12 22.552 12 22V20H6V16H12V14C12 13.448 12.449 13 13 13H19C19.551 13 20 13.448 20 14V16H26V20H20ZM3 23H2V13H3C3.551 13 4 13.448 4 14V22C4 22.552 3.551 23 3 23ZM29 11C27.346 11 26 12.346 26 14H22C22 12.346 20.654 11 19 11H13C11.346 11 10 12.346 10 14H6C6 12.346 4.654 11 3 11H0V25H3C4.654 25 6 23.654 6 22H10C10 23.654 11.346 25 13 25H19C20.654 25 22 23.654 22 22H26C26 23.654 27.346 25 29 25H32V11H29Z"
      fill="#535766"
    />
    <path fillRule="evenodd" clipRule="evenodd" d="M22 5H10V7H15V9H17V7H22V5Z" fill="#00BFB3" />
  </svg>
);
