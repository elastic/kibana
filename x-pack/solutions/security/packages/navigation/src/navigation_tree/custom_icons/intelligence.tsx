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
    <path d="M4 4V12H12V4H4ZM11 5V11H5V5H11ZM6 10H10V6H6V10ZM13 5H15V6H13V7.5H15V8.5H13V10H15V11H13V12C13 12.5523 12.5523 13 12 13H11V15H10V13H8.5V15H7.5V13H6V15H5V13H4C3.44772 13 3 12.5523 3 12V11H1V10H3V8.5H1V7.5H3V6H1V5H3V4C3 3.44772 3.44772 3 4 3H5V1H6V3H7.5V1H8.5V3H10V1H11V3H12C12.5523 3 13 3.44772 13 4V5Z" />
  </svg>
);

// TODO delete when the EUI icon has been updated
export const iconIntelligence = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
