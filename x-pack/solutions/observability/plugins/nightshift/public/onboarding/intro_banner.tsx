/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Blank-landing hero: media placeholder next to the Nightshift pitch. */
export function OnboardingIntroBanner(): React.ReactElement {
  const { euiTheme } = useEuiTheme();

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
            role="img"
            aria-label={i18n.translate('xpack.nightshift.onboarding.introMediaAriaLabel', {
              defaultMessage: 'Nightshift introduction video',
            })}
            css={css`
              align-items: center;
              background: linear-gradient(
                135deg,
                ${euiTheme.colors.backgroundLightPrimary},
                ${euiTheme.colors.backgroundLightAssistance}
              );
              display: flex;
              height: 160px;
              justify-content: center;
              width: 284px;
              max-width: 100%;
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
