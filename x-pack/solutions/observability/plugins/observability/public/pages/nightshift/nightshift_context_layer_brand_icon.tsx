/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiIcon } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

export const CONTEXT_LAYER_BRAND_ICON_SIZE_PX = 12;

const brandIconWrapperCss = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${CONTEXT_LAYER_BRAND_ICON_SIZE_PX}px;
  height: ${CONTEXT_LAYER_BRAND_ICON_SIZE_PX}px;
  flex-shrink: 0;

  .euiIcon,
  svg {
    width: ${CONTEXT_LAYER_BRAND_ICON_SIZE_PX}px !important;
    height: ${CONTEXT_LAYER_BRAND_ICON_SIZE_PX}px !important;
  }
`;

/** Atlassian Confluence mark (not shipped in EUI). */
const ConfluenceLogoIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    width={CONTEXT_LAYER_BRAND_ICON_SIZE_PX}
    height={CONTEXT_LAYER_BRAND_ICON_SIZE_PX}
    aria-hidden
  >
    <defs>
      <linearGradient
        id="nightshiftConfluenceB"
        gradientUnits="userSpaceOnUse"
        x1="95.037"
        x2="71.873"
        y1="104.185"
        y2="51.044"
      >
        <stop offset="0.18" stopColor="#0052cc" />
        <stop offset="1" stopColor="#2684ff" />
      </linearGradient>
      <linearGradient
        id="nightshiftConfluenceC"
        gradientUnits="userSpaceOnUse"
        x1="6770.46"
        x2="6500.78"
        y1="-77645.6"
        y2="-78879.7"
      >
        <stop offset="0.18" stopColor="#0052cc" />
        <stop offset="1" stopColor="#2684ff" />
      </linearGradient>
      <clipPath id="nightshiftConfluenceClip">
        <path d="M0 0h100v100H0z" />
      </clipPath>
    </defs>
    <g clipPath="url(#nightshiftConfluenceClip)">
      <path
        fill="url(#nightshiftConfluenceB)"
        d="M3.626 75.353C2.592 77.04 1.431 78.997.444 80.556a3.18 3.18 0 0 0 1.066 4.328l20.685 12.73a3.18 3.18 0 0 0 4.407-1.083c.828-1.384 1.894-3.182 3.055-5.107 8.195-13.525 16.437-11.87 31.298-4.774l20.51 9.754a3.18 3.18 0 0 0 4.28-1.591l9.849-22.276a3.18 3.18 0 0 0-1.591-4.169c-4.328-2.037-12.936-6.094-20.685-9.833C45.441 44.995 21.75 45.869 3.626 75.353"
      />
      <path
        fill="url(#nightshiftConfluenceC)"
        d="M96.374 24.803c1.034-1.687 2.196-3.644 3.182-5.203a3.18 3.18 0 0 0-1.066-4.328L77.805 2.542a3.18 3.18 0 0 0-4.535 1.051c-.827 1.384-1.893 3.182-3.055 5.108-8.194 13.524-16.436 11.87-31.297 4.773L18.472 3.768a3.18 3.18 0 0 0-4.28 1.591l-9.85 22.276a3.18 3.18 0 0 0 1.592 4.169c4.328 2.037 12.936 6.094 20.684 9.833 27.94 13.525 51.633 12.618 69.756-16.834"
      />
    </g>
  </svg>
);

const BRAND_ICON_BY_TASK_ID: Record<string, IconType | 'confluence'> = {
  code: 'logoGithub',
  wiki: 'confluence',
  conversations: 'logoSlack',
};

export interface NightshiftContextLayerBrandIconProps {
  taskId: string;
}

export const NightshiftContextLayerBrandIcon: React.FC<NightshiftContextLayerBrandIconProps> = ({
  taskId,
}) => {
  const iconType = BRAND_ICON_BY_TASK_ID[taskId];

  if (iconType === 'confluence') {
    return (
      <span css={brandIconWrapperCss} data-test-subj={`nightshiftContextLayerBrandIcon-${taskId}`}>
        <ConfluenceLogoIcon />
      </span>
    );
  }

  if (!iconType) {
    return null;
  }

  return (
    <span css={brandIconWrapperCss} data-test-subj={`nightshiftContextLayerBrandIcon-${taskId}`}>
      <EuiIcon type={iconType} aria-hidden />
    </span>
  );
};
