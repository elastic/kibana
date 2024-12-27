/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// TODO: This icon will be added to EUI soon - we should remove this custom SVG when once it's available in EUI
export const CursorIcon: React.FC = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="euiIcon"
    width={16}
    height={16}
    {...props}
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path d="M2.81789 2.82933L6.19997 12.5528L7.26894 11.3176C7.46197 11.1108 7.78799 11.1051 7.98803 11.3052C8.17855 11.4957 8.18384 11.8029 8 11.9999L6.64828 13.5381C6.26304 13.9509 5.5771 13.806 5.39161 13.2728L1.70057 2.661C1.49297 2.06414 2.07135 1.4938 2.66525 1.70977L12.8156 5.40081C13.3208 5.58452 13.4744 6.22441 13.1076 6.6174L10.3139 9.61065C10.3276 9.62172 10.3408 9.63361 10.3536 9.64634L14.8536 14.1463C15.0488 14.3416 15.0488 14.6582 14.8536 14.8534C14.6583 15.0487 14.3417 15.0487 14.1464 14.8534L9.64645 10.3534C9.61737 10.3244 9.59262 10.2926 9.5722 10.2589L9.27692 9.96365C9.0864 9.77313 9.0811 9.46591 9.26494 9.26894L12.1186 6.21142L2.81789 2.82933Z" />
  </svg>
);
