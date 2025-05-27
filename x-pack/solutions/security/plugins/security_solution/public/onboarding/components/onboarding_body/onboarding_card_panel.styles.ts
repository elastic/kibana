/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const HEIGHT_ANIMATION_DURATION = 250;

export const useCardPanelStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const successBackgroundColor = euiTheme.colors.backgroundBaseSuccess;
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;
  const darkModeStyles = useDarkPanelStyles(isDarkMode);

  return css`
    .onboardingCardHeader {
      padding: calc(${euiTheme.size.s} * 2);
      cursor: pointer;
    }
    .onboardingCardIcon {
      padding: ${euiTheme.size.m};
      border-radius: 50%;
      background-color: ${isDarkMode
        ? euiTheme.colors.lightShade
        : euiTheme.colors.backgroundBaseSubdued};
      display: flex;
      align-items: center;
    }
    .onboardingCardHeaderTitle {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
    .onboardingCardHeaderCompleteBadge {
      background-color: ${isDarkMode ? euiTheme.colors.success : successBackgroundColor};
      color: ${isDarkMode ? euiTheme.colors.emptyShade : euiTheme.colors.textSuccess};
    }
    .onboardingCardContentWrapper {
      display: grid;
      visibility: collapse;
      grid-template-rows: 0fr;
      transition: grid-template-rows ${HEIGHT_ANIMATION_DURATION}ms ease-in,
        visibility ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
    }
    .onboardingCardContent {
      overflow: hidden;
    }

    &.onboardingCardPanel-expanded {
      border: 2px solid ${euiTheme.colors.primary};

      .onboardingCardContentWrapper {
        visibility: visible;
        grid-template-rows: 1fr;
      }
    }

    &.onboardingCardPanel-completed {
      .onboardingCardIcon {
        background-color: ${successBackgroundColor};
      }
    }
    ${darkModeStyles}
  `;
};

export const useDarkPanelStyles = (isDarkMode: boolean) => {
  const { euiTheme } = useEuiTheme();
  const darkPanelStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-color: ${euiTheme.colors.borderBasePlain};
  `;
  return isDarkMode ? darkPanelStyles : '';
};
