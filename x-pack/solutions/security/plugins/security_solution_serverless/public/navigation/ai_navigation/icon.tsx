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
  <svg fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fill="#F04E98"
      fillRule="evenodd"
      d="M5.625 4.38V0h12.5v10.465c0 2.446-3.986 4.048-5.635 4.535V4.38H5.625Z"
      clipRule="evenodd"
    />
    <path
      fill="#FACB3D"
      fillRule="evenodd"
      d="M1.875 12.546V6.25h8.75V20s-8.75-3.769-8.75-7.454Z"
      clipRule="evenodd"
    />
    <path
      fill="#0B64DD"
      fillRule="evenodd"
      d="M5.625 6.25h5V15c-1.865-.713-5-2.348-5-4.402V6.25Z"
      clipRule="evenodd"
    />
  </svg>
);

export const AiNavigationIcon = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
