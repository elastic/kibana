/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';

export const useBorder = () => {
  const { euiTheme } = useEuiTheme();
  return `1px solid ${euiTheme.colors.borderBasePlain}`;
};

export const AnimatedSearchBarContainer = styled.div`
  display: grid;
  grid-template-rows: 1fr;
  border-top: ${() => useBorder()};
  padding: 16px 8px;

  &.toggled-off {
    padding: 0;
    border-top: none;
    transform: translateY(-100%);
    grid-template-rows: 0fr;
  }

  ${euiCanAnimate} {
    ${() => {
      const { euiTheme } = useEuiTheme();
      return `transition: transform ${euiTheme.animation.normal} ease,
      grid-template-rows ${euiTheme.animation.normal} ease;
    `;
    }}
  }

  & > div {
    padding: 0;

    ${euiCanAnimate} {
      ${() => {
        const { euiTheme } = useEuiTheme();
        return `transition: padding ${euiTheme.animation.normal} ease;`;
      }}
    }
  }

  /* Clip during the collapse animation only; expanded state must let
     content stay visible so a tall input never hides surrounding controls. */
  &.toggled-off > div {
    overflow: hidden;
    padding: 0;
  }

  /* In the narrow graph flyout, the KQL textarea can grow multi-line.
     Anchor the row's controls to the top so they keep their position
     instead of drifting with the row's vertical center, and cap the
     textarea at ~3 lines (euiTheme.size.xl = 32px) so longer queries
     scroll inside the input. The !important defeats the upstream rule
     '.kbnQueryBar__textarea.kbnQueryBar__textarea--autoHeight' (0,3,0). */
  .kbnQueryBar {
    align-items: flex-start;
  }

  .kbnQueryBar__textarea.kbnQueryBar__textarea--autoHeight {
    max-height: 96px !important;
  }
`;
