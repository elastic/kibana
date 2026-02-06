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
    <path d="M13 9H3V10H13V9ZM7 13H9V11H7V13ZM3 3V8H13V3H3ZM14 10C14 10.5523 13.5523 11 13 11H10V13H12V14H4V13H6V11H3C2.44772 11 2 10.5523 2 10V3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V10Z" />
  </svg>
);

export const iconAssets = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
