/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SVGProps } from 'react';

/**
 * AlertZero product icon, to be passed as an `EuiIcon` `type`. Mirrors the EUI `productAlertZero`
 * icon, which Kibana can only use from EUI 123.3.0 on; replace usages with it after that upgrade.
 */
export const AlertZeroIcon: React.FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" {...props}>
    <path d="M11.283 14.24A7 7 0 0 1 8 15.053l-.362-.01a7 7 0 0 1-2.976-.833l.642-.793A6 6 0 0 0 8 14.053c.989 0 1.921-.24 2.745-.661z" />
    <path
      fillRule="evenodd"
      d="M8 .016a1.486 1.486 0 0 1 .365 2.925v2.084A2.997 2.997 0 0 1 10.995 8l-.003.153a3 3 0 0 1-.231 1.002l1.826 1.055a1.485 1.485 0 1 1-.382.648l-1.82-1.05a2.99 2.99 0 0 1-2.386 1.19l-.154-.005a3 3 0 0 1-2.22-1.166L3.8 10.88a1.485 1.485 0 0 1-2.722 1.125 1.487 1.487 0 0 1 2.35-1.78l1.815-1.048a3 3 0 0 1-.238-1.025L5 8a3 3 0 0 1 2.612-2.974v-2.09A1.485 1.485 0 0 1 8 .016M2.787 11.019a.487.487 0 1 0-.844.487.487.487 0 0 0 .844-.487m11.09-.18a.487.487 0 1 0-.484.844.487.487 0 0 0 .485-.843M8 6.002a1.998 1.998 0 1 0 0 3.997A1.998 1.998 0 0 0 8 6m0-4.985a.487.487 0 1 0 0 .974.487.487 0 0 0 0-.973"
      clipRule="evenodd"
    />
    <path d="M4.802 2.878A6.04 6.04 0 0 0 1.955 7.99l-1 .023v-.005A7.04 7.04 0 0 1 4.28 2.023zm6.993-.806a7.04 7.04 0 0 1 3.249 5.925l-1 .006a6.04 6.04 0 0 0-2.835-5.117z" />
  </svg>
);
