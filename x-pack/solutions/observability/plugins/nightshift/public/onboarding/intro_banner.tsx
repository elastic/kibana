/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiButton,
  EuiButtonIcon,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import posterSrc from './assets/elky_story_poster.jpg';

const EXPLORE_LIVE_EXAMPLE_HREF: string | undefined = undefined;

const MEDIA_WIDTH_PX = 425;
const MEDIA_HEIGHT_PX = 239;
const COPY_PADDING_INLINE_PX = 32;

const getDismissedStorageKey = (basePath: string): string =>
  `nightshift.onboarding.introBannerDismissed:${basePath || 'default'}`;

const dismissLabel = i18n.translate('xpack.nightshift.onboarding.dismissIntroBanner', {
  defaultMessage: 'Dismiss intro banner',
});

export function OnboardingIntroBanner(): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibana().services;
  const [isDismissed = false, setIsDismissed] = useLocalStorage<boolean>(
    getDismissedStorageKey(http.basePath.get()),
    false
  );

  if (isDismissed) return null;

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
        <img
          src={posterSrc}
          alt={i18n.translate('xpack.nightshift.onboarding.introMediaAriaLabel', {
            defaultMessage: 'Elastic nightshift overview video',
          })}
          css={css`
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
          data-test-subj="nightshiftOnboardingIntroBannerPoster"
        />
        <div
          aria-hidden={true}
          css={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <div
            css={css`
              align-items: center;
              background: ${euiTheme.colors.backgroundBasePlain};
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
              display: flex;
              height: 48px;
              justify-content: center;
              width: 48px;
            `}
          >
            <EuiIcon type="play" size="l" color="primary" aria-hidden={true} />
          </div>
        </div>
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
              defaultMessage: 'Elastic nightshift is an SRE coworker that is always there for you',
            })}
          </h2>
        </EuiTitle>
        <EuiText
          size="s"
          color="subdued"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          <p>
            {i18n.translate('xpack.nightshift.onboarding.introDescription', {
              defaultMessage:
                'Elastic nightshift helps you detect, investigate and resolve problems faster. Once you add data, it will start analyzing.',
            })}
          </p>
        </EuiText>
        {EXPLORE_LIVE_EXAMPLE_HREF && (
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
        )}
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
            onClick={() => setIsDismissed(true)}
            data-test-subj="nightshiftOnboardingIntroBannerDismiss"
          />
        </EuiToolTip>
      </div>
    </EuiPanel>
  );
}
