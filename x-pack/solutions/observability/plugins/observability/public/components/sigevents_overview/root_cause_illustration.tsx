/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface RootCauseIllustrationProps {
  size?: number;
  'aria-hidden'?: boolean;
}

export function RootCauseIllustration({
  size = 48,
  'aria-hidden': ariaHidden = true,
}: RootCauseIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
      data-test-subj="sigeventsOverviewRootCauseIllustration"
    >
      <mask
        id="rootCauseIllustrationMask"
        style={{ maskType: 'luminance' }}
        maskUnits="userSpaceOnUse"
        x="2"
        y="3"
        width="47"
        height="46"
      >
        <path d="M48.8353 3.25H2.84375V48.8028H48.8353V3.25Z" fill="white" />
      </mask>
      <g mask="url(#rootCauseIllustrationMask)">
        <path
          d="M27.8125 5.60938C16.4822 5.60938 7.29688 14.7947 7.29688 26.125C7.29688 37.4553 16.4822 46.6406 27.8125 46.6406C39.1428 46.6406 48.3281 37.4553 48.3281 26.125C48.3281 14.7947 39.1428 5.60938 27.8125 5.60938ZM27.8125 40.4656C19.8906 40.4656 13.4678 34.0428 13.4678 26.1209C13.4678 18.1991 19.8906 11.7763 27.8125 11.7763C35.7344 11.7763 42.1572 18.1991 42.1572 26.1209C42.1572 34.0428 35.7344 40.4656 27.8125 40.4656Z"
          fill="#153385"
          stroke="#101C3F"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M26.9922 33.5391C31.0872 33.5391 34.4063 30.22 34.4063 26.125C34.4063 22.03 31.0872 18.7109 26.9922 18.7109C22.8972 18.7109 19.5781 22.03 19.5781 26.125C19.5781 30.22 22.8972 33.5391 26.9922 33.5391Z"
          fill="#153385"
          stroke="#101C3F"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M25.959 5.60938C14.6287 5.60938 5.44336 14.7947 5.44336 26.1209C5.44336 37.4472 14.6287 46.6366 25.959 46.6366C37.2893 46.6366 46.4746 37.4512 46.4746 26.1209C46.4746 14.7906 37.2893 5.60938 25.959 5.60938ZM25.959 40.4656C18.0371 40.4656 11.6143 34.0428 11.6143 26.1209C11.6143 18.1991 18.0371 11.7763 25.959 11.7763C33.8809 11.7763 40.3037 18.1991 40.3037 26.1209C40.3037 34.0428 33.8809 40.4656 25.959 40.4656Z"
          fill="#0B64DD"
          stroke="#101C3F"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M25.959 33.5391C30.054 33.5391 33.373 30.22 33.373 26.125C33.373 22.03 30.054 18.7109 25.959 18.7109C21.864 18.7109 18.5449 22.03 18.5449 26.125C18.5449 30.22 21.864 33.5391 25.959 33.5391Z"
          fill="#48EFCF"
          stroke="#101C3F"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M25.959 3.25V14.3569"
          stroke="#153385"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M25.959 37.6914V48.7983"
          stroke="#153385"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M48.8354 25.9414H37.7285"
          stroke="#153385"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M13.9506 25.9414H2.84375"
          stroke="#153385"
          strokeWidth="1.04464"
          strokeMiterlimit="10"
        />
        <path
          d="M20.6953 26.1642C20.6953 26.1642 25.3591 19.5017 31.2253 26.1642C31.2253 26.1642 26.6956 32.4286 20.6953 26.1642Z"
          fill="white"
        />
        <path
          d="M25.8422 28.7195C27.2763 28.7195 28.4422 27.5536 28.4422 26.1195C28.4422 24.6855 27.2803 23.5195 25.8422 23.5195C24.4041 23.5195 23.2422 24.6814 23.2422 26.1195C23.2422 27.5577 24.4041 28.7195 25.8422 28.7195Z"
          fill="#101C3F"
        />
      </g>
    </svg>
  );
}
