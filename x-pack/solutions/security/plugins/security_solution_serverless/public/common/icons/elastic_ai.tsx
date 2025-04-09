/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const ElasticAI: React.FC<SVGProps<SVGSVGElement>> = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="none">
    <circle cx="25" cy="25" r="18.5" stroke="#F04E98" opacity=".8" />
    <circle cx="25" cy="25.001" r="24.5" stroke="#F04E98" opacity=".4" />
    <path fill="#F04E98" d="M25.5 24.251H30v6.75h-4.5v-6.75Z" />
    <path
      fill="#00BFB3"
      d="M19.5 27.626a3.375 3.375 0 0 1 3.375-3.375H24v6.75h-1.125a3.375 3.375 0 0 1-3.375-3.375Z"
    />
    <path fill="#0B64DD" d="M30 21.251a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    <path fill="#FEC514" d="M19.875 23.314A4.125 4.125 0 0 1 24 19.189v4.125h-4.125Z" />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default ElasticAI;
