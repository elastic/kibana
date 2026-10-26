/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const outerPanelStyle = ({ euiTheme }: UseEuiTheme) =>
  css({
    height: '100%',
    // On hover, highlight the card's border in the primary color.
    '&:hover::after': {
      borderColor: euiTheme.colors.primary,
    },
    // On hover, change the icon panel background color to signal the card is clickable.
    '&:hover .vectordbOnboardingPathIconPanel': {
      backgroundColor: euiTheme.colors.backgroundBasePrimary,
    },
  });

export const iconContainerStyle = css({
  height: '100%',
});

export const getStartedTextStyle = ({ euiTheme }: UseEuiTheme) =>
  css({
    color: euiTheme.colors.textParagraph,
    fontWeight: euiTheme.font.weight.semiBold,
  });
