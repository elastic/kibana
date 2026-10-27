/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const CYCLE = '1.2s';
const CYCLE_MS = 1200;
const CORNERS = new Set([0, 3, 12, 15]);
/** Ring order from the Orbit variant: eight cells pulse one after another. */
const RING_ORDER = [1, 2, 7, 11, 14, 13, 8, 4];

const LOADING_LABEL = i18n.translate('xpack.alertzero.workersRunningPanel.loadingLabel', {
  defaultMessage: 'Loading',
});

/** 16px Orbit dots: a 4×4 grid with the corners removed, from the motion-refresh loader. */
export const OrbitDotsLoader: React.FC<{ size?: number }> = ({ size = 16 }) => {
  const { euiTheme } = useEuiTheme();
  const rest = euiTheme.colors.lightShade;
  const peak = euiTheme.colors.textSubdued;
  const pulse = keyframes`
    0%, 45%, 100% { fill: ${rest}; }
    15% { fill: ${peak}; }
  `;

  const cells = [];
  for (let index = 0; index < 16; index++) {
    if (CORNERS.has(index)) {
      continue;
    }
    const ringIndex = RING_ORDER.indexOf(index);
    cells.push(
      <rect
        key={index}
        x={(index % 4) * 4}
        y={Math.floor(index / 4) * 4}
        width="2"
        height="2"
        className={ringIndex >= 0 ? 'ring' : undefined}
        style={
          ringIndex >= 0
            ? { animationDelay: `${Math.round((ringIndex * CYCLE_MS) / 8)}ms` }
            : undefined
        }
      />
    );
  }

  return (
    <svg
      role="progressbar"
      aria-label={LOADING_LABEL}
      data-variant="orbit"
      data-test-subj="alertZeroOrbitDots"
      viewBox="0 0 14 14"
      width={size}
      height={size}
      css={css`
        flex-shrink: 0;
        rect {
          fill: ${rest};
        }
        ${euiCanAnimate} {
          rect.ring {
            animation: ${pulse} ${CYCLE} ease-in-out infinite;
          }
        }
      `}
    >
      {cells}
    </svg>
  );
};
