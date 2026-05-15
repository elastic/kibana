/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
  type EuiStepsProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useHistory, useLocation } from 'react-router-dom';
import { LogoIcon, type SupportedLogo } from './logo_icon';

export type HostOs = 'linux' | 'mac' | 'windows';

interface HostOsLayoutProps {
  os: HostOs;
  title: string;
  subtitle: string;
  logo: SupportedLogo;
  banners?: React.ReactNode;
  steps: EuiStepsProps['steps'];
  feedback?: React.ReactNode;
}

export const HostOsLayout: React.FC<HostOsLayoutProps> = ({
  os,
  title,
  subtitle,
  logo,
  banners,
  steps,
  feedback,
}) => {
  const history = useHistory();
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');
  // Preserve the ingestion-mode and any other search params so the user's
  // selection survives a round-trip through the landing page.
  const { onClick: onReturnClick, href: returnHref } = reactRouterNavigate(
    history,
    `/${location.search}`
  );

  return (
    // V2 host page chrome, mirroring `header/custom_header.tsx` from the
    // production flows (Kubernetes / OTel Logs):
    //   - One restrictWidth Section with the Return link + the logo/title/caption
    //     header, separated from the steps by a bottom border.
    //   - A second restrictWidth Section holding only the steps panel.
    // BackButton from the production header navigates `../`, which from
    // `/host/<os>/auto-detect` would land on `/host/<os>` rather than the
    // landing page. We inline the header instead so the Return can keep
    // pushing to `/${search}` regardless of which sub-page we're on.
    <EuiPageTemplate paddingSize="none">
      <EuiPageTemplate.Section
        grow={false}
        paddingSize="l"
        restrictWidth
        css={css`
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiButtonEmpty
          iconType="chevronSingleLeft"
          flush="left"
          href={returnHref}
          onClick={onReturnClick}
          data-test-subj="observabilityOnboardingHostV2Return"
        >
          {i18n.translate('xpack.observability_onboarding.hostV2.returnLink', {
            defaultMessage: 'Return',
          })}
        </EuiButtonEmpty>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <div
              css={css`
                border-radius: ${euiTheme.border.radius.medium};
                ${shadow}
              `}
            >
              <LogoIcon
                logo={logo}
                size="xl"
                css={css`
                  margin: 8px;
                  width: 40px;
                  height: 40px;
                `}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{title}</h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="m">
              <p>{subtitle}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" restrictWidth>
        {/* No border around the steps — the design shows them flowing
            directly on the page background. The test-subj stays on this
            wrapper so existing Jest / Scout assertions keep working. */}
        <div data-test-subj={`observabilityOnboardingHostV2Layout-${os}`}>
          <EuiFlexGroup direction="column" gutterSize="m">
            {banners && <EuiFlexItem grow={false}>{banners}</EuiFlexItem>}

            <EuiFlexItem grow={false}>
              <EuiSteps steps={steps} />
            </EuiFlexItem>

            {feedback && <EuiFlexItem grow={false}>{feedback}</EuiFlexItem>}
          </EuiFlexGroup>
        </div>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
