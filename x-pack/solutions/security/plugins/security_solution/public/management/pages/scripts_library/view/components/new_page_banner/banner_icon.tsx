/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';

export const ScriptPageBannerIcon = memo((props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <path
        fill="#153385"
        stroke="#101c3f"
        strokeMiterlimit="10"
        strokeWidth=".4"
        d="m41.3 21.4-5 20.7q-.3.8-1.2.8H8q-1.2-.2-1.1-1.4L12.2 21v-2q0-1.1 1.2-1.2h8.1q1 0 1.1.9.3.8 1.2.9h16.5q1.2.2 1.1 1.4v.4z"
      />
      <path
        fill="#fff"
        stroke="#101c3f"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth=".4"
        d="m38.7 12-7-7h-20v32.3h27z"
      />
      <path
        fill="#48efcf"
        stroke="#101c3f"
        strokeLinejoin="round"
        strokeWidth=".4"
        d="M31.7 5v7.1h7z"
      />
      <path fill="#101c3f" d="m31.7 12.3 7 2v-2.2z" />
      <path
        fill="#48efcf"
        stroke="#101c3f"
        strokeMiterlimit="10"
        strokeWidth=".4"
        d="M20.3 9h-6v6h6z"
      />
      <path fill="#0b64dd" d="M17.2 14.2 15 11.6l.9-.8 1.5 1.6 4-3.8.9 1z" />
      <path
        stroke="#101c3f"
        strokeMiterlimit="10"
        strokeWidth=".4"
        d="M23.4 12.6H29m-5.6-2.9H27m-3.6 5.7h11.5m-11.5 2.9h11.5m-10.1 2.8h10.1M26.2 24h8.7m-6.1 2.8H35m-5.8 2.9h5.7m-5.7 2.8h5.7"
      />
      <path
        fill="#0b64dd"
        stroke="#101c3f"
        strokeMiterlimit="10"
        strokeWidth=".4"
        d="M36.1 20.8v21q-.1 1-1.1 1.1H7.3q-1-.1-1.1-1.1V19q.1-1.1 1.1-1.2h8.3q.9 0 1.2 1 .1.7 1 .8H35q1 0 1.1 1.2Z"
      />
    </svg>
  );
});

ScriptPageBannerIcon.displayName = 'ScriptPageBannerIcon';
