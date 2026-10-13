/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import * as i18n from './translations';

// The reference intro banner gives its media column 32% of the row; the box keeps standard video
// proportions so the eventual clip fits it without letterboxing.
const MEDIA_WIDTH_PERCENT = 32;
const VIDEO_ASPECT_RATIO = '16 / 9';

export const OnboardingIntroPromo: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        /* Clip the media column's gradient to the panel's rounded corners. */
        overflow: hidden;
      `}
      data-test-subj="alertZeroOnboardingIntroPromo"
    >
      <EuiFlexGroup gutterSize="none" alignItems="stretch" responsive>
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            /* EuiFlexGroup's responsive mode stacks items by forcing flex-basis: 100%, so below its
               breakpoint the box goes full width and the aspect ratio keeps it at video proportions. */
            flex: 0 0 ${MEDIA_WIDTH_PERCENT}%;
            aspect-ratio: ${VIDEO_ASPECT_RATIO};
            background: linear-gradient(
              135deg,
              ${euiTheme.colors.backgroundLightPrimary},
              ${euiTheme.colors.backgroundLightAccent}
            );
          `}
          data-test-subj="alertZeroOnboardingVideoPlaceholder"
        >
          {/* TODO: replace with the intro video once it is available. */}
          <div
            css={css`
              position: absolute;
              inset-block-start: 50%;
              inset-inline-start: 50%;
              transform: translate(-50%, -50%);
            `}
          >
            <EuiToolTip content={i18n.VIDEO_PLACEHOLDER_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                display="fill"
                size="m"
                iconType="play"
                isDisabled
                aria-label={i18n.VIDEO_PLACEHOLDER_LABEL}
              />
            </EuiToolTip>
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            justify-content: center;
            padding: ${euiTheme.size.l};
          `}
        >
          <EuiTitle size="xs">
            <h2>{i18n.INTRO_PROMO_LEAD}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>{i18n.INTRO_PROMO_BODY}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <div>
            {/* Outlined rather than filled: EUI has no outline variant, so an empty button carries the border. */}
            <EuiButtonEmpty
              size="s"
              href={ONBOARDING_READ_MORE_URL_PLACEHOLDER}
              target="_blank"
              iconType="external"
              iconSide="right"
              css={css`
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
              `}
              data-test-subj="alertZeroOnboardingReadMoreLink"
            >
              {i18n.INTRO_READ_MORE}
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
