/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const AgentBuilderPanelContainer = ({ euiTheme }: UseEuiTheme) => css`
  @media (max-width: ${euiTheme.breakpoint.m}px) {
    border-top: ${euiTheme.border.thin};
  }
  @media (min-width: ${euiTheme.breakpoint.m}px) {
    border-left: ${euiTheme.border.thin};
  }
`;

// The AI tool logos are bundled as SVG URLs, so `EuiIcon` renders them as `<img>` and its
// `color` prop is ignored. Must mask the SVG and color it with `textSubdued`, which is aware of
// color mode.
export const brandIcon =
  (icon: string) =>
  ({ euiTheme }: UseEuiTheme) =>
    css`
      display: inline-block;
      inline-size: ${euiTheme.size.base};
      block-size: ${euiTheme.size.base};
      background-color: ${euiTheme.colors.textSubdued};
      mask-image: url(${icon});
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
    `;
