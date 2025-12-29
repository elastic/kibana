/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

// TODO: Remove Gradient constants when EUI supports AI gradients (borders, icons, etc.)
// see https://github.com/elastic/kibana-team/issues/2398

// Shared gradient variables
const gradientStartPercent = 2.98;
const gradientEndPercent = 66.24;
const panelBackgroundGradientAngle = 98;
const panelBorderAndButtonGradientAngle = 131;

const lightModeColors = {
  panelBackgroundGradient: `linear-gradient(${panelBackgroundGradientAngle}deg, rgba(217, 232, 255, 0.3) ${gradientStartPercent}%, rgba(236, 226, 254, 0.3) ${gradientEndPercent}%)`,
  panelBorderGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, rgba(23, 80, 186, 0.35) ${gradientStartPercent}%, rgba(115, 29, 207, 0.35) ${gradientEndPercent}%)`,
  buttonGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, #0b64dd ${gradientStartPercent}%, #731dcf ${gradientEndPercent}%)`,
  iconGradientStartColor: '#0B64DD',
  iconGradientEndColor: '#731DCF',
};

const darkModeColors = {
  panelBackgroundGradient: `linear-gradient(${panelBackgroundGradientAngle}deg, rgba(15, 40, 90, 0.15) ${gradientStartPercent}%, rgba(40, 20, 60, 0.15) ${gradientEndPercent}%)`,
  panelBorderGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, rgba(60, 120, 220, 0.4) ${gradientStartPercent}%, rgba(140, 60, 200, 0.4) ${gradientEndPercent}%)`,
  buttonGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, #1E7FE8 ${gradientStartPercent}%, #8B2DD6 ${gradientEndPercent}%)`,
  iconGradientStartColor: '#1E7FE8',
  iconGradientEndColor: '#8B2DD6',
};

export const useGradientStyles = () => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();

  return useMemo(() => {
    const colors = isDarkMode ? darkModeColors : lightModeColors;

    return {
      gradientSVG: (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="sparkles-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset={`${gradientStartPercent}%`} stopColor={colors.iconGradientStartColor} />
              <stop offset={`${gradientEndPercent}%`} stopColor={colors.iconGradientEndColor} />
            </linearGradient>
          </defs>
        </svg>
      ),
      gradientPanelStyle: css`
        position: relative;
        background: ${colors.panelBackgroundGradient};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.m};
        &::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          background: ${colors.panelBorderGradient};
          border-radius: ${euiTheme.border.radius.medium};
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          pointer-events: none;
        }
      `,
      buttonGradientStyle: css`
        background: ${colors.buttonGradient} !important;
        border-radius: 4px;
        color: #fff !important;
        &:hover:not(:disabled) {
          background: ${colors.buttonGradient} !important;
          color: #fff !important;
        }
        &:focus:not(:disabled) {
          background: ${colors.buttonGradient} !important;
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
    };
  }, [euiTheme, isDarkMode]);
};
