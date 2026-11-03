/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Vidyard intro video — same player Kibana CSP already allows (`play.vidyard.com`). */
const INTRO_VIDEO_SRC = '//play.vidyard.com/EU8nJMgSQEZUpkv6Eg9Wck';

/** Blank-landing hero: intro video next to the Nightshift pitch. */
export function OnboardingIntroBanner(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const videoTitle = i18n.translate('xpack.nightshift.onboarding.introMediaAriaLabel', {
    defaultMessage: 'Nightshift introduction video',
  });

  return (
    <div
      data-test-subj="nightshiftOnboardingIntroBanner"
      css={css`
        border: ${euiTheme.border.width.thin} solid transparent;
        border-radius: ${euiTheme.border.radius.medium};
        background-image: linear-gradient(
            ${euiTheme.colors.backgroundBasePlain},
            ${euiTheme.colors.backgroundBasePlain}
          ),
          linear-gradient(
            99deg,
            ${euiTheme.colors.borderStrongPrimary},
            ${euiTheme.colors.borderStrongAssistance}
          );
        background-origin: border-box;
        background-clip: padding-box, border-box;
        overflow: hidden;
      `}
    >
      <EuiFlexGroup gutterSize="none" responsive alignItems="stretch">
        <EuiFlexItem grow={false}>
          <div
            css={css`
              /* Match the previous media slot (284×160 ≈ Vidyard 488×275). */
              aspect-ratio: 488 / 275;
              background: ${euiTheme.colors.backgroundLightPrimary};
              height: 160px;
              max-width: 100%;
              overflow: hidden;
              width: 284px;

              iframe {
                border: 0;
                display: block;
                height: 100%;
                width: 100%;
              }
            `}
          >
            <iframe
              allow="autoplay"
              allowFullScreen={true}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
              src={INTRO_VIDEO_SRC}
              title={videoTitle}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            justify-content: center;
            padding: ${euiTheme.size.l} ${euiTheme.size.xl};
          `}
        >
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.nightshift.onboarding.introTitle', {
                defaultMessage:
                  'Elastic Nightshift is an SRE coworker that is always there for you',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.nightshift.onboarding.introDescription', {
                defaultMessage:
                  'Nightshift explores your telemetry, and any tool you give it credentials for, to find problems worth investigating. Within a few minutes it suggests your first investigations, based on the alerts, errors and recent changes it finds.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
