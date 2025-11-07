/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconDeviceControl: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    {...props}
  >
    <path
      d="M26.25 0C27.216 0 28 .776 28 1.733v15.6c0 .957-.784 1.733-1.75 1.733H17.5l1.75 5.2h2.625c.483 0 .875.39.875.868a.87.87 0 0 1-.875.866H15v-1.733h2.5l-1.75-5.2H15v-1.734h11.25v-15.6H1.75v15.6H4v1.733H1.75c-.966 0-1.75-.776-1.75-1.733v-15.6C0 .776.784 0 1.75 0h24.5z"
      fill="#535766"
    />
    <path
      d="M12.071 13A1.94 1.94 0 0 1 14 14.95v9.1A1.94 1.94 0 0 1 12.071 26H6.93A1.94 1.94 0 0 1 5 24.05v-9.1A1.94 1.94 0 0 1 6.929 13h5.142zm-5.37 1.6c-.387 0-.701.28-.701.626v8.75c0 .345.314.625.7.625h5.6c.386 0 .7-.28.7-.625v-8.75c0-.346-.314-.625-.7-.625H6.7z"
      fill="#16C5C0"
    />
    <path
      d="M12 9a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h5zm-5 4h5v-3H7v3z"
      fill="#16C5C0"
    />
  </svg>
);
