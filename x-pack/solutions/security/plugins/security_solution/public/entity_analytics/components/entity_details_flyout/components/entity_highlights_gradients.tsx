/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

// TODO: Remove Gradient constants when EUI supports AI gradients (borders, icons, etc.)
const gradientStartPercent = 2.98;
const gradientEndPercent = 66.24;
const panelBackgroundGradient = `linear-gradient(98deg, rgba(217, 232, 255, 0.3) ${gradientStartPercent}%, rgba(236, 226, 254, 0.3) ${gradientEndPercent}%)`;
const panelBorderGradient = `linear-gradient(131deg, rgba(23, 80, 186, 0.35) ${gradientStartPercent}%, rgba(115, 29, 207, 0.35) ${gradientEndPercent}%)`;
const buttonGradient = `linear-gradient(131deg, #0b64dd ${gradientStartPercent}%, #731dcf ${gradientEndPercent}%)`;
const iconGradientStartColor = '#0B64DD';
const iconGradientEndColor = '#731DCF';

export const useGradientStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      gradientSVG: (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="sparkles-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset={`${gradientStartPercent}%`} stopColor={iconGradientStartColor} />
              <stop offset={`${gradientEndPercent}%`} stopColor={iconGradientEndColor} />
            </linearGradient>
          </defs>
        </svg>
      ),
      gradientPanelStyle: css`
        position: relative;
        background: ${panelBackgroundGradient};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.m};
        &::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          background: ${panelBorderGradient};
          border-radius: ${euiTheme.border.radius.medium};
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          pointer-events: none;
        }
      `,
      buttonGradientStyle: css`
        background: ${buttonGradient} !important;
        border-radius: 4px;
        color: #fff !important;
        &:hover:not(:disabled) {
          background: ${buttonGradient} !important;
          color: #fff !important;
        }
        &:focus:not(:disabled) {
          background: ${buttonGradient} !important;
          color: #fff !important;
        }
        &:disabled {
          opacity: 0.5;
        }
      `,
      iconGradientStyle: css`
        & * {
          fill: url(#sparkles-gradient) !important;
        }
      `,
    }),
    [euiTheme]
  );
};
