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
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.75098 8.07617H8.75098V4.01953L9.75098 4.59668V8.07617H11C11.3148 8.07617 11.611 8.22476 11.7998 8.47656L14.5 12.0762H15.75V13.0762H14.5C14.1852 13.0762 13.889 12.9276 13.7002 12.6758L11 9.07617H9.75V13.0762H8.75V9.07617H7.75V14.0762H6.75V13.0762H4.75V14.0762H3.75V9.07617H2.75V13.0762H1.75L1.75098 4.59473L2.75098 4.01758V8.07617ZM4.75 12.0762H6.75V11.0762H4.75V12.0762ZM4.75 10.0762H6.75V9.07617H4.75V10.0762Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.75 3.07617C6.85457 3.07617 7.75 3.9716 7.75 5.07617C7.75 6.18074 6.85457 7.07617 5.75 7.07617C4.64543 7.07617 3.75 6.18074 3.75 5.07617C3.75 3.9716 4.64543 3.07617 5.75 3.07617ZM5.75 4.07617C5.19772 4.07617 4.75 4.52389 4.75 5.07617C4.75 5.62846 5.19772 6.07617 5.75 6.07617C6.30228 6.07617 6.75 5.62846 6.75 5.07617C6.75 4.52389 6.30228 4.07617 5.75 4.07617Z"
    />
    <path
      d="M9.49805 2.1416L9.5 2.14355L11.5 3.29785L11 4.16309L9.75098 3.44141L9.00195 3.00977L5.75098 1.15234L2.49805 3.01074L2.49707 3.00977L0.499023 4.16309L0 3.29785L2.00098 2.14355L2.00293 2.1416L5.75 0L9.49805 2.1416Z"
      fill="black"
    />
  </svg>
);

export const iconPlayground = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon type={iconType} size={size} {...rest} />;
};
