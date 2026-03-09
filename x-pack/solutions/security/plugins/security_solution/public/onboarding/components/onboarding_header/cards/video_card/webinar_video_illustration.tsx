/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Inline webinar/video illustration (128x128 viewBox).
 * Used for the "Watch 2 minute overview video" card icon.
 */
export const WebinarVideoIllustration: React.FC<{
  size?: number;
  alt?: string;
  className?: string;
}> = ({ size = 64, alt = 'Watch 2 minute overview video', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label={alt}
    className={className}
  >
    <path
      d="M104.05 21.56H21.07C17.9938 21.56 15.5 24.0538 15.5 27.13V103.88C15.5 106.956 17.9938 109.45 21.07 109.45H104.05C107.126 109.45 109.62 106.956 109.62 103.88V27.13C109.62 24.0538 107.126 21.56 104.05 21.56Z"
      fill="#153385"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M106.79 21.5H23.81C20.7338 21.5 18.24 23.9938 18.24 27.07V103.82C18.24 106.896 20.7338 109.39 23.81 109.39H106.79C109.866 109.39 112.36 106.896 112.36 103.82V27.07C112.36 23.9938 109.866 21.5 106.79 21.5Z"
      fill="#0B64DD"
    />
    <path
      d="M106.79 21.5H23.81C20.7338 21.5 18.24 23.9938 18.24 27.07V103.82C18.24 106.896 20.7338 109.39 23.81 109.39H106.79C109.866 109.39 112.36 106.896 112.36 103.82V27.07C112.36 23.9938 109.866 21.5 106.79 21.5Z"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path d="M18.3101 37.29H112.17" stroke="#101C3F" strokeMiterlimit="10" />
    <path
      d="M39.14 28.06H28.15C27.073 28.06 26.2 28.933 26.2 30.01V30.39C26.2 31.467 27.073 32.34 28.15 32.34H39.14C40.2169 32.34 41.09 31.467 41.09 30.39V30.01C41.09 28.933 40.2169 28.06 39.14 28.06Z"
      fill="white"
    />
    <path
      d="M64.23 100.52C49.33 100.52 37.25 88.43 37.25 73.51C37.25 58.59 49.33 46.5 64.23 46.5C79.13 46.5 91.21 58.59 91.21 73.51C91.21 88.43 79.13 100.52 64.23 100.52Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M66.76 100.52C51.86 100.52 39.78 88.43 39.78 73.51C39.78 58.59 51.86 46.5 66.76 46.5C81.66 46.5 93.74 58.59 93.74 73.51C93.74 88.43 81.66 100.52 66.76 100.52Z"
      fill="white"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M81.9299 71.71L59.7199 58.43C58.2599 57.55 56.3199 58.52 56.3199 60.12V86.92C56.3199 88.53 58.2799 89.49 59.7399 88.6L81.9499 75.08C83.2699 74.28 83.2599 72.51 81.9299 71.72V71.71Z"
      fill="#0B64DD"
    />
    <path
      d="M113.28 100.26L115.11 99.18L119.62 96.62L119.1 94.39L112.57 96.6L85.39 88.69L92.65 116.75L92 121.54L93.91 122.83L96.99 116.74L100.59 109.88L110.22 120.06L117.67 112.61L107.51 103.36L113.28 100.26Z"
      fill="#153385"
    />
    <path
      d="M92.25 121.06L94.15 122.36L96.99 116.74L100.59 109.88L110.22 120.06L117.67 112.61L107.51 103.36L113.28 100.26L115.11 99.18L119.62 96.62L118.67 94.54"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M117.67 94.51L83.01 85.41L92.12 120.06L97.68 107.52L110.22 120.06L117.67 112.61L105.13 100.07L117.67 94.51Z"
      fill="#48EFCF"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
  </svg>
);
