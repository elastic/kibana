/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
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

export const OnboardingIntroPromo: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="alertZeroOnboardingIntroPromo"
    >
      <EuiFlexGroup gutterSize="none" alignItems="stretch" responsive>
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            width: 40%;
            min-width: 240px;
            min-height: 200px;
            justify-content: flex-end;
            padding: ${euiTheme.size.base};
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
          <EuiTitle size="xs">
            <h1>{i18n.INTRO_TITLE}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            justify-content: center;
            padding: ${euiTheme.size.xl};
          `}
        >
          <EuiText>
            <h2>{i18n.INTRO_PROMO_LEAD}</h2>
            <p>{i18n.INTRO_PROMO_BODY}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <div>
            <EuiButton
              href={ONBOARDING_READ_MORE_URL_PLACEHOLDER}
              target="_blank"
              iconType="external"
              iconSide="right"
              data-test-subj="alertZeroOnboardingReadMoreLink"
            >
              {i18n.READ_MORE}
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
