/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export const IconArtifacts: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
  const isDarkMode = useKibanaIsDarkMode();

  const light = (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 4.69325C1 0.927757 5.8963 -0.424857 7.74512 2.85634L15.1475 16.0028L14.8711 16.4931L7.74512 29.1483C5.89659 32.4298 1.00019 31.0779 1 27.3124V4.69325ZM6.00195 3.83583C5.17253 2.36381 3 2.96348 3 4.69032V27.3095C3 29.0364 5.17259 29.6362 6.00195 28.164L12.8525 15.9999L6.00195 3.83583Z"
        fill="#101C3F"
      />
      <path
        d="M18.6237 1C20.7656 1.00005 22.7586 2.08692 23.903 3.88184L30.3239 14H27.9557L22.2155 4.95605C21.4405 3.74021 20.0842 3.00005 18.6237 3H13.3893L19.4177 14H17.1374L10.0124 1H18.6237Z"
        fill="#1750BA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23 20C21.3433 20 20 21.3433 20 23C20 24.6567 21.3433 26 23 26C24.6567 26 26 24.6567 26 23C26 21.3433 24.6567 20 23 20ZM18 23C18 20.2387 20.2387 18 23 18C25.7613 18 28 20.2387 28 23C28 25.7613 25.7613 28 23 28C20.2387 28 18 25.7613 18 23Z"
        fill="#101C3F"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M24 16V19H22V16H24Z" fill="#101C3F" />
      <path fillRule="evenodd" clipRule="evenodd" d="M24 27V30H22V27H24Z" fill="#101C3F" />
      <path fillRule="evenodd" clipRule="evenodd" d="M30 24H27V22H30V24Z" fill="#101C3F" />
      <path fillRule="evenodd" clipRule="evenodd" d="M19 24H16V22H19V24Z" fill="#101C3F" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27.2423 28.657L25.1213 26.535L26.5359 25.1211L28.6569 27.2431L27.2423 28.657Z"
        fill="#101C3F"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.464 20.8787L17.343 18.7567L18.7576 17.3428L20.8786 19.4648L19.464 20.8787Z"
        fill="#101C3F"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28.6569 18.7569L26.5359 20.8789L25.1213 19.465L27.2423 17.343L28.6569 18.7569Z"
        fill="#101C3F"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.8786 26.5352L18.7576 28.6572L17.343 27.2433L19.464 25.1213L20.8786 26.5352Z"
        fill="#101C3F"
      />
    </svg>
  );

  // Replace inner content below with dark-theme SVG (use unique ids, e.g. artifacts-dark-* in defs).
  const dark = (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 4.69325C1 0.927757 5.8963 -0.424857 7.74512 2.85634L15.1475 16.0028L14.8711 16.4931L7.74512 29.1483C5.89659 32.4298 1.00019 31.0779 1 27.3124V4.69325ZM6.00195 3.83583C5.17253 2.36381 3 2.96348 3 4.69032V27.3095C3 29.0364 5.17259 29.6362 6.00195 28.164L12.8525 15.9999L6.00195 3.83583Z"
        fill="white"
      />
      <path
        d="M18.6237 1C20.7656 1.00005 22.7586 2.08692 23.903 3.88184L30.3239 14H27.9557L22.2155 4.95605C21.4405 3.74021 20.0842 3.00005 18.6237 3H13.3893L19.4177 14H17.1374L10.0124 1H18.6237Z"
        fill="#48EFCF"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23 20C21.3433 20 20 21.3433 20 23C20 24.6567 21.3433 26 23 26C24.6567 26 26 24.6567 26 23C26 21.3433 24.6567 20 23 20ZM18 23C18 20.2387 20.2387 18 23 18C25.7613 18 28 20.2387 28 23C28 25.7613 25.7613 28 23 28C20.2387 28 18 25.7613 18 23Z"
        fill="white"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M24 16V19H22V16H24Z" fill="white" />
      <path fillRule="evenodd" clipRule="evenodd" d="M24 27V30H22V27H24Z" fill="white" />
      <path fillRule="evenodd" clipRule="evenodd" d="M30 24H27V22H30V24Z" fill="white" />
      <path fillRule="evenodd" clipRule="evenodd" d="M19 24H16V22H19V24Z" fill="white" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27.2423 28.657L25.1213 26.535L26.5359 25.1211L28.6569 27.2431L27.2423 28.657Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.464 20.8787L17.343 18.7567L18.7576 17.3428L20.8786 19.4648L19.464 20.8787Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28.6569 18.7569L26.5359 20.8789L25.1213 19.465L27.2423 17.343L28.6569 18.7569Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.8786 26.5352L18.7576 28.6572L17.343 27.2433L19.464 25.1213L20.8786 26.5352Z"
        fill="white"
      />
    </svg>
  );

  return isDarkMode ? dark : light;
};
