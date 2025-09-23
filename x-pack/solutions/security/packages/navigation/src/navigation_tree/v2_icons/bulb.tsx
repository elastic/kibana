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
      fill="#1D2A3E"
      fillRule="evenodd"
      d="M7.999 2c2.2092 0 4 1.7909 4 4 0 1.0672-.4199 2.0369-1.1006 2.752-.6075.6382-.8994 1.0862-.8994 1.4873V14h-4v-3.7607c0-.4011-.2918-.8491-.8994-1.4873C4.419 8.0369 3.999 7.0672 3.999 6c0-2.2091 1.7909-4 4-4Zm-1 11h2v-1h-2v1Zm1-10c-1.6568 0-3 1.3431-3 3 0 .8003.3142 1.5257.8252 2.0625.5842.6137 1.1748 1.3295 1.1748 2.1768V11h2v-.7607c0-.8473.5906-1.5631 1.1748-2.1768.5111-.5368.8252-1.2622.8252-2.0625 0-1.6569-1.3431-3-3-3Z"
      clipRule="evenodd"
    />
    <path
      fill="#1D2A3E"
      d="m3.9219 8.9287-1.7325 1-.5-.8662 1.7325-1 .5.8662Zm10.3965.1338-.5.8662-1.7315-1 .5-.8662 1.7315 1ZM3.004 6.4951h-2v-1h2v1Zm11.9999 0h-2v-1h2v1ZM3.9268 3.0625l-.501.8662-1.7315-1 .5-.8662 1.7325 1Zm10.3867-.1338-1.7315 1-.5-.8662 1.7315-1 .5.8662Z"
    />
  </svg>
);

export const iconBulb = ({ size = 'm', ...rest }: Omit<EuiIconProps, 'type'>) => {
  return <EuiIcon {...{ type: iconType, size, ...rest }} />;
};
