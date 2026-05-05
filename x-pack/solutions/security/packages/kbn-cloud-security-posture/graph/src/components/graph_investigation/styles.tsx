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

  /* Clip on the inner div only while toggled-off, so the wrapper stays free
     to grow with the input in the expanded state. The trade-off is that the
     expand transition no longer clips intermediate frames, but the textarea
     cap below keeps the content small enough that there's nothing to clip. */
  &.toggled-off > div {
    overflow: hidden;
    padding: 0;
  }

  /* In the narrow graph flyout, the KQL textarea can grow multi-line and
     push the row's controls out of view. Anchor controls to the top, and
     cap the auto-height textarea at 3 lines so longer queries scroll inside
     the input. The selector matches the upstream specificity (0,3,0) of
     '.kbnQueryBar__textarea.kbnQueryBar__textarea--autoHeight' from the kql
     plugin's QueryStringInput; !important removes any reliance on injection
     order between the two unrelated styled components. */
  .kbnQueryBar {
    align-items: flex-start;
  }

  .kbnQueryBar__textarea.kbnQueryBar__textarea--autoHeight {
    max-height: calc(${() => useEuiTheme().euiTheme.size.xl} * 3) !important;
  }
`;
