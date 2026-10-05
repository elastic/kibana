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
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
  const rowPaddingCss = css`
    padding: ${euiTheme.size.base};
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
          <EuiText color="subdued">
            <p>{subtitle}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OnboardingPreviewTabs activeIndex={activeIndex} onSelect={select} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" aria-hidden="true">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={rowPaddingCss}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleDown" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <p>{label}</p>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={badgeColor}>{count}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        {items.map((item) => (
          <OnboardingPreviewRow key={item.title} {...item} />
        ))}
      </EuiPanel>
    </EuiPanel>
  );
};
