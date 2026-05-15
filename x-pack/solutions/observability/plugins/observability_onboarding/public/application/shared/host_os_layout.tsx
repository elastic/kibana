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
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  type EuiStepsProps,
} from '@elastic/eui';
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
  // Preserve the ingestion-mode and any other search params so the user's
  // selection survives a round-trip through the landing page.
  const { onClick: onReturnClick, href: returnHref } = reactRouterNavigate(
    history,
    `/${location.search}`
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="xl"
      data-test-subj={`observabilityOnboardingHostV2Layout-${os}`}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="arrowLeft"
            flush="left"
            href={returnHref}
            onClick={onReturnClick}
            data-test-subj="observabilityOnboardingHostV2Return"
          >
            {i18n.translate('xpack.observability_onboarding.hostV2.returnLink', {
              defaultMessage: 'Return',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <LogoIcon logo={logo} size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h1>{title}</h1>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText color="subdued" size="s">
                {subtitle}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {banners && <EuiFlexItem grow={false}>{banners}</EuiFlexItem>}

        <EuiFlexItem grow={false}>
          <EuiSteps steps={steps} />
        </EuiFlexItem>

        {feedback && <EuiFlexItem grow={false}>{feedback}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
