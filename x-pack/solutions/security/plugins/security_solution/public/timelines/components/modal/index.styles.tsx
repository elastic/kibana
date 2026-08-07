/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/css';
import { Global } from '@emotion/react';
import {
  euiAnimFadeIn,
  euiAnimSlideInUp,
  euiBackgroundColor,
  euiCanAnimate,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';

/**
 * @param zIndexOverride When the new flyout system is enabled, this is dynamically computed by
 * `useTimelinePortalZIndex` so that Timeline stays correctly stacked relative to the new
 * EUI-managed flyouts. Falls back to the static `maskBelowHeader` theme value otherwise (ie the
 * legacy expandable flyout system, where `TimelineFlyout`/`SecuritySolutionFlyout` handle their own
 * fixed offsets relative to that same static value).
 */
export const usePaneStyles = (zIndexOverride?: number) => {
  const EuiTheme = useEuiTheme();
  const { euiTheme } = EuiTheme;

  return css`
    // euiOverlayMask styles
    position: fixed;
    top: var(--kbn-layout--application-top, 0px);
    left: var(--kbn-layout--application-left, 0px);
    right: var(--kbn-layout--application-right, 0px);
    bottom: var(--kbn-layout--application-bottom, 0px);
    // TODO EUI: add color with transparency
    background: ${transparentize(euiTheme.colors.plainDark, 0.5)};
    z-index: ${zIndexOverride ?? euiTheme.levels.maskBelowHeader};

    ${euiCanAnimate} {
      animation: ${euiAnimFadeIn} ${euiTheme.animation.fast} ease-in;
    }

    &.timeline-portal-overlay-mask--hidden {
      display: none;
    }

    .timeline-container {
      min-width: 150px;
      position: fixed;
      top: var(--kbn-layout--application-top, 0px);
      left: var(--kbn-layout--application-left, 0px);
      right: var(--kbn-layout--application-right, 0px);
      bottom: var(--kbn-layout--application-bottom, 0px);
      background: ${euiBackgroundColor(EuiTheme, 'plain')};
      ${euiCanAnimate} {
        animation: ${euiAnimSlideInUp(euiTheme.size.xxl)} ${euiTheme.animation.normal}
          cubic-bezier(0.39, 0.575, 0.565, 1);
      }
    }

    &:not(.timeline-portal-overlay-mask--full-screen) .timeline-container {
      margin: ${euiTheme.size.m};
      border-radius: ${euiTheme.border.radius.medium};
    }
  `;
};

export const OverflowHiddenGlobalStyles = () => {
  return <Global styles={'body { overflow: hidden }'} />;
};
