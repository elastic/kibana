/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import type { SVGProps } from 'react';
import React from 'react';

const iconType: React.FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M13.5 8.5V3C13.5 2.72386 13.2761 2.5 13 2.5H3C2.72386 2.5 2.5 2.72386 2.5 3V8.5M13.5 8.5H2.5M13.5 8.5V10C13.5 10.2761 13.2761 10.5 13 10.5H3C2.72386 10.5 2.5 10.2761 2.5 10V8.5"
      stroke="black"
    />
    <path d="M6.5 10.5V13.5M6.5 13.5H9.5M6.5 13.5H4M9.5 13.5V10.5M9.5 13.5H12" stroke="black" />
  </svg>
);

export const iconAssets = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
