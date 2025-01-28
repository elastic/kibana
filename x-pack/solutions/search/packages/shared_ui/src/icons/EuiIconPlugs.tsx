/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Temporary custom asset while it's available in EUI

import * as React from 'react';
import type { SVGProps } from 'react';
interface SVGRProps {
  title?: string;
  titleId?: string;
}
export const EuiIconPlugs = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      fillRule="evenodd"
      d="m15.354 1.354-2.08 2.08a3 3 0 0 1-.324 3.859l-1.414 1.414-4.243-4.242L8.707 3.05a3 3 0 0 1 3.86-.324l2.08-2.08.707.708Zm-5.94 2.403-.707.708 2.829 2.828.707-.707a2 2 0 1 0-2.829-2.829ZM5.171 8 3.757 6.586l-.707.707.707.707-.707.707a3 3 0 0 0-.324 3.86l-2.08 2.08.708.707 2.079-2.08a3 3 0 0 0 3.86-.324l.706-.707.708.707.707-.707L8 10.829 9.768 9.06l-.707-.707-1.769 1.768-1.414-1.415L7.647 6.94l-.708-.707L5.171 8ZM3.757 9.414l.707-.707 2.828 2.829-.707.707a2 2 0 0 1-2.828-2.829Z"
      clipRule="evenodd"
    />
  </svg>
);
