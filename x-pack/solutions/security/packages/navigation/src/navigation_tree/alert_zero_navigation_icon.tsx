/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Interpolation, Theme } from '@emotion/react';
import { css, keyframes } from '@emotion/react';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import type { SVGProps } from 'react';
import React from 'react';

// POC: the AlertZero loop currently served on the motion playground (port 4000).
// extraSlow × 10 = 5000ms. The 240° stop is at 60%: a 3000ms turn, then a 2000ms hold.
const ALERT_ZERO_CYCLE_BEATS = 10;

const alertZeroOrbit = keyframes`
  0% { transform: rotate(0deg); }
  60% { transform: rotate(240deg); }
  100% { transform: rotate(240deg); }
`;

export const AlertZeroNavigationIcon = ({
  css: iconCss,
  ...props
}: SVGProps<SVGSVGElement> & { css?: Interpolation<Theme> }) => {
  const { euiTheme } = useEuiTheme();

  return (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    {...props}
    css={[
      iconCss,
      css`
        fill: currentColor;

        .nodes,
        .arrows {
          /* The centre of the 16×16 viewBox. view-box keeps 8px on that centre when EuiIcon transforms the svg. */
          transform-box: view-box;
          transform-origin: 8px 8px;
        }

        ${euiCanAnimate} {
          [data-menu-item][data-highlighted='false']:hover & .nodes,
          [data-menu-item][data-highlighted='false']:hover & .arrows {
            /* Longhands: a cubic-bezier in the animation shorthand is split on its commas. */
            animation-name: ${alertZeroOrbit};
            animation-duration: calc(${euiTheme.animation.extraSlow} * ${ALERT_ZERO_CYCLE_BEATS});
            animation-timing-function: ${euiTheme.animation.resistance};
            animation-iteration-count: infinite;
          }
        }
      `,
    ]}
  >
      <g className="nodes">
        <path d="M8 .016A1.486 1.486 0 0 1 8.365 2.941L8.365 5.025A2.997 2.997 0 0 1 10.995 8L10.991 8.153A3 3 0 0 1 10.761 9.155L12.587 10.21A1.485 1.485 0 1 1 12.205 10.858L10.385 9.808A2.99 2.99 0 0 1 7.999 10.998L7.845 10.992A3 3 0 0 1 5.625 9.826L3.8 10.88A1.485 1.485 0 0 1 1.077 12.005A1.487 1.487 0 0 1 3.428 10.225L5.243 9.177A3 3 0 0 1 5.005 8.152L5 8A3 3 0 0 1 7.612 5.026L7.612 2.936A1.485 1.485 0 0 1 8 .016M2.787 11.019A.487 .487 0 1 0 1.943 11.506A.487 .487 0 0 0 2.787 11.019M13.877 10.839A.487 .487 0 1 0 13.393 11.683A.487 .487 0 0 0 13.877 10.84M8 6.002A1.998 1.998 0 1 0 8 9.998A1.999 1.999 0 0 0 8 6M8 1.014A.487 .487 0 1 0 8 1.988A.487 .487 0 0 0 8 1.015" />
      </g>
      <g className="arrows">
        <path d="M11.283 14.24A7 7 0 0 1 8 15.053L7.638 15.043A7 7 0 0 1 4.662 14.21L5.304 13.417A6 6 0 0 0 8 14.053C8.989 14.053 9.921 13.813 10.745 13.392L11.283 14.24" />
        <path d="M4.802 2.878A6.04 6.04 0 0 0 1.955 7.99L.955 8.013L.955 8.008A7.04 7.04 0 0 1 4.28 2.023L4.802 2.878" />
        <path d="M11.795 2.072A7.04 7.04 0 0 1 15.044 7.997L14.044 8.003A6.04 6.04 0 0 0 11.209 2.886L11.795 2.072" />
      </g>
  </svg>
  );
};
