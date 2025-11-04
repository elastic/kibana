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
    <path d="M8 1C8.85836 1 9.68053 1.1548 10.4404 1.4375L9.64746 2.23047C9.12388 2.08125 8.57146 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 7.42812 13.918 6.87549 13.7686 6.35156L14.5615 5.55859C14.8445 6.31882 15 7.14119 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1Z" />
    <path d="M8 4C8.3453 4 8.68038 4.04371 9 4.12598V4.87891L8.77441 5.10352C8.52717 5.03758 8.26802 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11C9.65685 11 11 9.65685 11 8C11 7.73157 10.9616 7.4722 10.8955 7.22461L11.1211 7H11.874C11.9563 7.31962 12 7.6547 12 8C12 10.2091 10.2091 12 8 12C5.79086 12 4 10.2091 4 8C4 5.79086 5.79086 4 8 4Z" />
    <path d="M13 3H15.707L12.707 6H10.707L8.35352 8.35352L7.64648 7.64648L10 5.29297V3.29297L13 0.292969V3ZM11 3.70703V5H12.293L13.293 4H12V2.70703L11 3.70703Z" />
    <path d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" />
  </svg>
);

// TODO delete when the EUI icon has been updated
export const iconFindings = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
