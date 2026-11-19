/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

const duration = (euiTheme: EuiThemeComputed): string => euiTheme.animation.normal ?? '250ms';
const easing = (euiTheme: EuiThemeComputed): string =>
  euiTheme.animation.resistance ?? 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const nightshiftBackgroundTransition = (euiTheme: EuiThemeComputed): string =>
  `background ${duration(euiTheme)} ${easing(euiTheme)}`;

export const nightshiftBackgroundColorTransition = (euiTheme: EuiThemeComputed): string =>
  `background-color ${duration(euiTheme)} ${easing(euiTheme)}`;

export const nightshiftOpacityTransition = (euiTheme: EuiThemeComputed): string =>
  `opacity ${duration(euiTheme)} ${easing(euiTheme)}`;

export const nightshiftTransformTransition = (euiTheme: EuiThemeComputed): string =>
  `transform ${duration(euiTheme)} ${easing(euiTheme)}`;

export const nightshiftBoxShadowTransition = (euiTheme: EuiThemeComputed): string =>
  `box-shadow ${duration(euiTheme)} ${easing(euiTheme)}`;

export const nightshiftBorderColorTransition = (euiTheme: EuiThemeComputed): string =>
  `border-color ${duration(euiTheme)} ${easing(euiTheme)}`;

export const nightshiftInteractiveSurfaceTransition = (euiTheme: EuiThemeComputed): string =>
  `${nightshiftBackgroundColorTransition(euiTheme)}, ${nightshiftBorderColorTransition(euiTheme)}`;

export const nightshiftStatusCardTransition = (euiTheme: EuiThemeComputed): string =>
  `${nightshiftBoxShadowTransition(euiTheme)}, ${nightshiftBackgroundColorTransition(
    euiTheme
  )}, ${nightshiftBorderColorTransition(euiTheme)}`;

export const nightshiftReducedMotionStyles = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;
