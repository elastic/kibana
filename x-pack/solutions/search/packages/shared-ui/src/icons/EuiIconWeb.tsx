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
export const EuiIconWeb = ({ title, titleId, ...props }: SVGProps<SVGSVGElement> & SVGRProps) => (
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
      d="M2.208 2H1V1h13a1 1 0 0 1 1 1v13h-1v-1.207a11.437 11.437 0 0 0-5.214-1.395l-.603 1.043-.866-.5.602-1.043A11.562 11.562 0 0 0 4.102 8.08l-1.043.602-.5-.866 1.043-.603A11.438 11.438 0 0 0 2.208 2Zm1.125 0a12.429 12.429 0 0 1 1.245 4.651L6.2 5.715A8.452 8.452 0 0 0 5.206 2H3.333Zm2.99 0c.453.974.746 2.037.844 3.156l1.629-.94A5.466 5.466 0 0 0 8.203 2h-1.88Zm2.981 0a6.46 6.46 0 0 1 .446 1.665L12.634 2h-3.33Zm3.83.866-2.886 1.666c.459.35.87.761 1.22 1.22l1.666-2.886Zm-2.216 3.839a5.531 5.531 0 0 0-1.623-1.623l-1.629.94a9.55 9.55 0 0 1 2.311 2.312l.94-1.63ZM9.419 9.3a8.547 8.547 0 0 0-2.72-2.72l-1.623.937a12.566 12.566 0 0 1 3.406 3.406L9.419 9.3Zm-.07 2.121c1.66.112 3.23.547 4.651 1.244v-1.872a8.451 8.451 0 0 0-3.715-.994l-.936 1.622Zm1.495-2.59A9.442 9.442 0 0 1 14 9.678v-1.88a5.464 5.464 0 0 0-2.216-.593l-.94 1.629Zm1.49-2.582A6.457 6.457 0 0 1 14 6.696v-3.33L12.335 6.25Z"
      clipRule="evenodd"
    />
  </svg>
);
