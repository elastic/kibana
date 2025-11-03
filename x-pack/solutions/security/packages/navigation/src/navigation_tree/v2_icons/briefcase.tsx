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
    <path d="M10 1a1.5 1.5 0 0 1 1.5 1.5V3h2A1.5 1.5 0 0 1 15 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-9A1.5 1.5 0 0 1 2.5 3h2v-.5A1.5 1.5 0 0 1 6 1h4ZM2 13.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V9H2v4.5ZM8 10a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM2.5 4a.5.5 0 0 0-.5.5V8h12V4.5a.5.5 0 0 0-.5-.5h-11ZM6 2a.5.5 0 0 0-.5.5V3h5v-.5A.5.5 0 0 0 10 2H6Z" />
  </svg>
);

export const iconBriefcase = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
