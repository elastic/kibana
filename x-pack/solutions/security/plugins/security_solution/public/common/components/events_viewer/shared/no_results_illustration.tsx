/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const ILLUSTRATION_ID = 'empty-state-no-results-magnify';

/**
 * Inline "analyze magnify glass" empty state illustration (Figma node 3398-17363).
 * Rendered inline to avoid cached asset serving the previous design.
 */
export const NoResultsIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 200,
  height = 148,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 128 128"
    fill="none"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden
  >
    <defs>
      <linearGradient id={`${ILLUSTRATION_ID}-frame`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1BA9F5" />
        <stop offset="100%" stopColor="#0B64DD" />
      </linearGradient>
      <linearGradient id={`${ILLUSTRATION_ID}-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0B64DD" />
        <stop offset="100%" stopColor="#153385" />
      </linearGradient>
    </defs>
    <g transform="translate(64, 58)">
      <circle
        cx="0"
        cy="0"
        r="38"
        fill={`url(#${ILLUSTRATION_ID}-frame)`}
        stroke="#101C3F"
        strokeWidth={1.5}
      />
      <circle cx="0" cy="0" r="32" fill="#FFFFFF" />
      <path
        d="M -22 10 L 0 -4 L 22 -14"
        stroke="#101C3F"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="-4" r="4" fill="#48EFCF" />
      <circle cx="22" cy="-14" r="4" fill="#48EFCF" />
      <path
        d="M -18 32 L -32 58"
        stroke={`url(#${ILLUSTRATION_ID}-shadow)`}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <path
        d="M -18 32 L -32 58"
        stroke={`url(#${ILLUSTRATION_ID}-frame)`}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path
        d="M -18 32 L -32 58"
        stroke="#101C3F"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  </svg>
);
