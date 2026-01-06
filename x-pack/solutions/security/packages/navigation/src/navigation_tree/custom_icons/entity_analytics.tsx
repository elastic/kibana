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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <path d="M1 14V1H2V14H15V15H2C1.44772 15 1 14.5523 1 14ZM5 11H4V12H5V11ZM9 9H8V12H9V9ZM13 7H12V12H13V7ZM4 8V10H5V8H4ZM8 6V8H9V6H8ZM12 4V6H13V4H12ZM6 12C6 12.5523 5.55228 13 5 13H4C3.44772 13 3 12.5523 3 12V8C3 7.44772 3.44772 7 4 7H5C5.55228 7 6 7.44772 6 8V12ZM10 12C10 12.5523 9.55228 13 9 13H8C7.44772 13 7 12.5523 7 12V6C7 5.44772 7.44772 5 8 5H9C9.55228 5 10 5.44772 10 6V12ZM14 12C14 12.5523 13.5523 13 13 13H12C11.4477 13 11 12.5523 11 12V4C11 3.44772 11.4477 3 12 3H13C13.5523 3 14 3.44772 14 4V12Z" />
  </svg>
);

export const iconEntityAnalytics = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
