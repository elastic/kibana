/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Nightshift alarm-clock icon in bright Elastic brand colors.
 * Designed for dark mode visibility with thick strokes and maximum fill.
 */
export const NightshiftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    {...props}
  >
    {/* Bell/hammer left */}
    <line x1="5" y1="6" x2="9" y2="10" stroke="#BD271E" strokeWidth="3" strokeLinecap="round" />
    {/* Bell/hammer right */}
    <line x1="27" y1="6" x2="23" y2="10" stroke="#BD271E" strokeWidth="3" strokeLinecap="round" />

    {/* Clock face ring */}
    <circle cx="16" cy="17" r="12" stroke="#00BFB3" strokeWidth="3" fill="none" />

    {/* Hour hand */}
    <line x1="16" y1="17" x2="16" y2="10" stroke="#FEC514" strokeWidth="3" strokeLinecap="round" />
    {/* Minute hand */}
    <line x1="16" y1="17" x2="22" y2="17" stroke="#FEC514" strokeWidth="3" strokeLinecap="round" />

    {/* Center dot */}
    <circle cx="16" cy="17" r="2" fill="#FEC514" />

    {/* Legs */}
    <line x1="9" y1="28" x2="11" y2="26" stroke="#00BFB3" strokeWidth="3" strokeLinecap="round" />
    <line x1="23" y1="28" x2="21" y2="26" stroke="#00BFB3" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
