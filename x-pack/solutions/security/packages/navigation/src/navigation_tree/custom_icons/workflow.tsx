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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" {...props}>
    <path d="M6 6v2h2V6H6ZM1 1v2h2V1H1Zm3 .5h7a3 3 0 1 1 0 6H9V8c0 .6-.4 1-1 1H6a1 1 0 0 1-1-1v-.5H3a2 2 0 1 0 0 4h9.3l-1.7-1.6.8-.8 2.8 2.9-2.8 2.9-.8-.8 1.7-1.6H3a3 3 0 1 1 0-6h2V6c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v.5h2a2 2 0 1 0 0-4H4V3c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V1c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v.5Z" />
  </svg>
);

export const iconWorkflow = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
