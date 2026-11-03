/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { OnboardingPreviewRow } from './onboarding_preview_row';
import { OnboardingPreviewTabs } from './onboarding_preview_tabs';
import { useAutoAdvanceIndex } from './use_auto_advance_index';
import * as i18n from './translations';

const AUTO_ADVANCE_MS = 6000;

/**
 * Static, illustrative mock of the running AlertZero queue that cycles through its sections. Rows are
 * decorative, so they are hidden from assistive tech; only the section tabs are interactive.
 * Rotation stops as soon as the user picks a section.
 */
export const OnboardingUiPreview: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  // Slide content animates in on change: the header leads with a fade-and-rise, rows cascade after
  // it (see OnboardingPreviewRow), and the subtitle cross-fades. Everything is gated on
  // euiCanAnimate so reduced-motion users get the instant swap the auto-advance hook already honors.
  const slideEnter = keyframes`
    from {
      opacity: 0;
      transform: translateY(${euiTheme.size.s});
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  const fadeIn = keyframes`
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  `;
  const subtitleCss = css`
    ${euiCanAnimate} {
      animation: ${fadeIn} ${euiTheme.animation.normal} ${euiTheme.animation.resistance} both;
    }
  `;
  // Group header mirrors the notdaybreak_mvp section header with its toggle removed: size.base
  // (16px) above and below the title, size.base inline, in a track no shorter than a 16px glyph
  // plus that padding.
  const headerRowCss = css`
    min-block-size: calc(${euiTheme.size.base} + ${euiTheme.size.base} * 2);
    padding: ${euiTheme.size.base};

    ${euiCanAnimate} {
      animation: ${slideEnter} ${euiTheme.animation.normal} ${euiTheme.animation.resistance} both;
    }
  `;
  const { activeIndex, select, pauseProps } = useAutoAdvanceIndex(
    i18n.PREVIEW_SLIDES.length,
    AUTO_ADVANCE_MS
  );

  const { label, subtitle, count, badgeColor, items } = i18n.PREVIEW_SLIDES[activeIndex];

  return (
    <EuiPanel
      color="transparent"
      hasShadow={false}
      // Without shadows EUI draws its own 1px ::after border, which would stack with the gradient
      // border below into a 2px edge. The gradient border is the only one this panel should have.
      hasBorder={false}
      paddingSize="l"
      css={css`
        border: ${euiTheme.border.width.thin} solid transparent;
        border-radius: ${euiTheme.size.m};
        background: linear-gradient(
              97.76deg,
              ${euiTheme.colors.backgroundBasePrimary} 17%,
              ${euiTheme.colors.backgroundBaseAccent} 83%
            )
            padding-box,
          linear-gradient(
              97.76deg,
              ${euiTheme.colors.backgroundLightPrimary} 17%,
              ${euiTheme.colors.backgroundLightAccent} 83%
            )
            border-box;
      `}
      data-test-subj="alertZeroOnboardingUiPreview"
      {...pauseProps}
    >
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <p>{i18n.INTRO_PREVIEW_HEADING}</p>
          </EuiTitle>
          <EuiText key={activeIndex} color="subdued" css={subtitleCss}>
            <p>{subtitle}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OnboardingPreviewTabs activeIndex={activeIndex} onSelect={select} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" aria-hidden="true">
        {/* Keyed on the slide so the header and rows remount, replaying their entrance. */}
        <React.Fragment key={activeIndex}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={headerRowCss}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <p>{label}</p>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={badgeColor}>{count}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {items.map((item, index) => (
            <OnboardingPreviewRow key={item.title} index={index} {...item} />
          ))}
        </React.Fragment>
      </EuiPanel>
    </EuiPanel>
  );
};
