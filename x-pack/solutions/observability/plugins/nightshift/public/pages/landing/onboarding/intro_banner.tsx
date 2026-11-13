/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EXPLORE_LIVE_EXAMPLE_HREF } from '../../../common/live_example';
import {
  type IntroBannerDismissal,
  useIntroBannerDismissal,
} from '../../../components/use_intro_banner_dismissal';
import { IntroBannerVideo } from './intro_banner_video';

const MEDIA_WIDTH_PX = 368;
const MEDIA_HEIGHT_PX = 239;
const COPY_PADDING_INLINE_PX = 32;

const dismissLabel = i18n.translate('xpack.nightshift.onboarding.dismissIntroBanner', {
  defaultMessage: 'Dismiss intro banner',
});

export function OnboardingIntroBanner({
  dismissal,
}: {
  dismissal?: IntroBannerDismissal;
}): React.ReactElement | null {
  return dismissal ? <IntroBanner dismissal={dismissal} /> : <StoredIntroBanner />;
}

const StoredIntroBanner = (): React.ReactElement => {
  const dismissal = useIntroBannerDismissal();
  return <IntroBanner dismissal={dismissal} />;
};

const IntroBanner = ({
  dismissal,
}: {
  dismissal: IntroBannerDismissal;
}): React.ReactElement | null => {
  const { euiTheme } = useEuiTheme();
  if (dismissal.isDismissed) return null;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        position: relative;
        display: flex;
        overflow: hidden;
      `}
      data-test-subj="nightshiftOnboardingIntroBanner"
    >
      <div
        css={css`
          position: relative;
          flex: 0 0 ${MEDIA_WIDTH_PX}px;
          height: ${MEDIA_HEIGHT_PX}px;
        `}
      >
        <IntroBannerVideo />
      </div>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          padding: ${euiTheme.size.l} calc(${COPY_PADDING_INLINE_PX}px + ${euiTheme.size.xl})
            ${euiTheme.size.l} ${COPY_PADDING_INLINE_PX}px;
        `}
      >
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.nightshift.onboarding.introTitle', {
              defaultMessage:
                'Elastic nightshift AI SRE is a co-worker that is always there for you',
            })}
          </h2>
        </EuiTitle>
        <EuiText
          size="s"
          color="subdued"
          css={css`
            margin-top: ${euiTheme.size.xs};
          `}
        >
          <p>
            {i18n.translate('xpack.nightshift.onboarding.introDescription', {
              defaultMessage: 'It helps you detect, investigate and resolve problems faster',
            })}
          </p>
        </EuiText>
        <div
          css={css`
            margin-top: ${euiTheme.size.m};
          `}
        >
          <EuiButton
            size="s"
            iconType="external"
            iconSide="right"
            href={EXPLORE_LIVE_EXAMPLE_HREF}
            target="_blank"
            data-test-subj="nightshiftOnboardingExploreLiveExample"
          >
            {i18n.translate('xpack.nightshift.onboarding.exploreLiveExampleButton', {
              defaultMessage: 'Explore live example',
            })}
          </EuiButton>
        </div>
      </div>
      <div
        css={css`
          position: absolute;
          top: ${euiTheme.size.s};
          right: ${euiTheme.size.s};
        `}
      >
        <EuiToolTip content={dismissLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            size="xs"
            color="text"
            iconType="cross"
            aria-label={dismissLabel}
            onClick={dismissal.dismiss}
            data-test-subj="nightshiftOnboardingIntroBannerDismiss"
          />
        </EuiToolTip>
      </div>
    </EuiPanel>
  );
};
