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

const panelBackgroundGradientAngle = 99;
const panelBackgroundGradientStartPercent = 3.97;
const panelBackgroundGradientEndPercent = 65.6;

const panelBorderAndButtonGradientAngle = 131;

const lightModeColors = {
  panelBackgroundGradient: `linear-gradient(${panelBackgroundGradientAngle}deg, rgba(217, 232, 255, 0.25) ${panelBackgroundGradientStartPercent}%, rgba(236, 226, 254, 0.25) ${panelBackgroundGradientEndPercent}%)`,
  panelBorderGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, rgba(23, 80, 186, 0.35) ${gradientStartPercent}%, rgba(115, 29, 207, 0.35) ${gradientEndPercent}%)`,
  buttonGradient: `linear-gradient(99deg, #D9E8FF 3.97%, #ECE2FE 65.6%)`,
  buttonTextGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, #1750ba ${gradientStartPercent}%, #8144cc ${gradientEndPercent}%)`,
  iconGradientStartColor: '#0B64DD',
  iconGradientEndColor: '#731DCF',
};

const darkModeColors = {
  // TODO: AI generated gradients, please replace it with UX designed gradients when they are available. https://github.com/elastic/security-team/issues/15312
  panelBackgroundGradient: `linear-gradient(${panelBackgroundGradientAngle}deg, rgba(11, 100, 221, 0.14) ${panelBackgroundGradientStartPercent}%, rgba(115, 29, 207, 0.14) ${panelBackgroundGradientEndPercent}%)`,
  panelBorderGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, rgba(96, 165, 250, 0.4) ${gradientStartPercent}%, rgba(192, 132, 252, 0.4) ${gradientEndPercent}%)`,
  buttonGradient: `linear-gradient(${panelBackgroundGradientAngle}deg, #123A79 ${panelBackgroundGradientStartPercent}%, #3B1D66 ${panelBackgroundGradientEndPercent}%)`,
  buttonTextGradient: `linear-gradient(${panelBorderAndButtonGradientAngle}deg, #D9E8FF ${gradientStartPercent}%, #ECE2FE ${gradientEndPercent}%)`,
  iconGradientStartColor: '#60A5FA',
  iconGradientEndColor: '#C084FC',
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
            <linearGradient id="entity-summary-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
        padding: ${euiTheme.size.base};
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

        &:hover:not(:disabled) {
          background: ${colors.buttonGradient} !important;
        }
        &:focus:not(:disabled) {
          background: ${colors.buttonGradient} !important;
        }
        &:disabled {
          opacity: 0.5;
        }
      `,
      buttonTextGradientStyle: css`
        background: ${colors.buttonTextGradient};
        background-clip: text;
        color: transparent;
      `,
      iconGradientStyle: css`
        & * {
          fill: url(#entity-summary-icon-gradient) !important;
        }
      `,
    };
  }, [euiTheme, isDarkMode]);
};
