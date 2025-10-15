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
    <path d="M1.5 1V14C1.5 14.2761 1.72386 14.5 2 14.5H15" stroke="black" />
    <path
      d="M5.5 10.5V12C5.5 12.2761 5.27614 12.5 5 12.5H4C3.72386 12.5 3.5 12.2761 3.5 12V10.5M5.5 10.5H3.5M5.5 10.5V8C5.5 7.72386 5.27614 7.5 5 7.5H4C3.72386 7.5 3.5 7.72386 3.5 8V10.5"
      stroke="black"
    />
    <path
      d="M9.5 8.5V12C9.5 12.2761 9.27614 12.5 9 12.5H8C7.72386 12.5 7.5 12.2761 7.5 12V8.5M9.5 8.5H7.5M9.5 8.5V6C9.5 5.72386 9.27614 5.5 9 5.5H8C7.72386 5.5 7.5 5.72386 7.5 6V8.5"
      stroke="black"
    />
    <path
      d="M13.5 6.5V12C13.5 12.2761 13.2761 12.5 13 12.5H12C11.7239 12.5 11.5 12.2761 11.5 12V6.5M13.5 6.5H11.5M13.5 6.5V4C13.5 3.72386 13.2761 3.5 13 3.5H12C11.7239 3.5 11.5 3.72386 11.5 4V6.5"
      stroke="black"
    />
  </svg>
);

export const iconEntityAnalytics = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
