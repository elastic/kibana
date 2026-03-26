/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useIsDarkMode,
} from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';
import { IntegrationCard } from './integration_card';
import imageSrcLight from './alert_summary_light.webp';
import imageSrcDark from './alert_summary_dark.webp';
import { useNavigateToIntegrationsPage } from '../../../hooks/alert_summary/use_navigate_to_integrations_page';

const TITLE = i18n.translate('xpack.securitySolution.alertSummary.landingPage.title', {
  defaultMessage: 'All your alerts in one place with AI',
});
const SUB_TITLE = i18n.translate('xpack.securitySolution.alertSummary.landingPage.subTitle', {
  defaultMessage: 'Bring in your SIEM data to begin surfacing alerts',
});
const DATA_TITLE = i18n.translate('xpack.securitySolution.alertSummary.landingPage.dataTitle', {
  defaultMessage: 'Start by connecting your data',
});
const IMAGE_TITLE = i18n.translate('xpack.securitySolution.alertSummary.landingPage.imageTitle', {
  defaultMessage: 'Alert Summary Dashboard showing alerts from various integrations',
});
const VIEW_ALL_INTEGRATIONS = i18n.translate(
  'xpack.securitySolution.alertSummary.landingPage.viewAllIntegrationsButtonLabel',
  {
    defaultMessage: 'View all integrations',
  }
);

const PRIMARY_INTEGRATIONS = ['splunk', 'google_secops'];

export const LANDING_PAGE_PROMPT_TEST_ID = 'alert-summary-landing-page-prompt';
export const LANDING_PAGE_IMAGE_TEST_ID = 'alert-summary-landing-page-image';
export const LANDING_PAGE_CARD_TEST_ID = 'alert-summary-landing-page-card-';
export const LANDING_PAGE_VIEW_ALL_INTEGRATIONS_BUTTON_TEST_ID =
  'alert-summary-landing-page-view-all-integrations-button';

export interface LandingPageProps {
  /**
   * List of available EASE integrations
   */
  packages: PackageListItem[];
}

/**
 * Displays a gif of the alerts summary page, with empty prompt showing the top 2 available EASE packages.
 * This page is rendered when no EASE packages are installed.
 */
export const LandingPage = memo(({ packages }: LandingPageProps) => {
  const { euiTheme } = useEuiTheme();
  const navigateToIntegrationsPage = useNavigateToIntegrationsPage();
  const imageSrc = useIsDarkMode() ? imageSrcDark : imageSrcLight;

  // We only want to show the 2 top integrations, Splunk and GoogleSecOps, in that specific order
  const primaryPackages = useMemo(
    () =>
      packages
        .filter((pkg) => PRIMARY_INTEGRATIONS.includes(pkg.name))
        .sort(
          (a, b) => PRIMARY_INTEGRATIONS.indexOf(a.name) - PRIMARY_INTEGRATIONS.indexOf(b.name)
        ),
    [packages]
  );

  return (
    <EuiFlexGroup data-test-subj={LANDING_PAGE_PROMPT_TEST_ID} direction="column" gutterSize="xl">
      <EuiFlexItem
        css={css`
          // to have the background color correctly applied
          // we need to compensate for the 24px padding that is applied to a parent component
          //(see here x-pack/solutions/security/plugins/security_solution/public/app/home/template_wrapper/index.tsx)
          margin: -${euiTheme.size.l} -${euiTheme.size.l} 0 -${euiTheme.size.l};
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          direction="column"
          css={css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiFlexItem>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{TITLE}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>{SUB_TITLE}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiImage
              data-test-subj={LANDING_PAGE_IMAGE_TEST_ID}
              role="presentation"
              alt={IMAGE_TITLE}
              src={imageSrc}
              margin={'xl'}
              css={css`
                width: 800px;
              `}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" direction="column">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{DATA_TITLE}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" alignItems="center">
              {primaryPackages.map((pkg) => (
                <EuiFlexItem grow={false} key={pkg.name}>
                  <IntegrationCard
                    integration={pkg}
                    data-test-subj={`${LANDING_PAGE_CARD_TEST_ID}${pkg.name}`}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={LANDING_PAGE_VIEW_ALL_INTEGRATIONS_BUTTON_TEST_ID}
              iconType="plusInCircle"
              onClick={navigateToIntegrationsPage}
            >
              {VIEW_ALL_INTEGRATIONS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

LandingPage.displayName = 'LandingPage';
