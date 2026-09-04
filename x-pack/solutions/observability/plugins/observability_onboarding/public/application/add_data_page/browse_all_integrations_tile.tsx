/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { OBLT_DEFAULT_CATEGORIES } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import { LogoIcon, type SupportedLogo } from '../shared/logo_icon';
import { addPathParamToUrl } from '../package_list_search_form/use_card_url_rewrite';

// Repeated category query params are Fleet's multi-filter encoding. A path
// category like /browse/observability drops the OpenTelemetry default.
const catalogueParams = new URLSearchParams();
for (const category of OBLT_DEFAULT_CATEGORIES) {
  catalogueParams.append('category', category);
}
const CATALOGUE_PATH = `/browse?${catalogueParams.toString()}`;

const CHIP_LOGOS: readonly SupportedLogo[] = [
  'nginx',
  'logstash',
  'apache',
  'rabbitmq',
  'redis',
  'mysql',
];

export const BrowseAllIntegrationsTile = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const handleClick = useCallback(() => {
    application.navigateToApp('integrations', {
      path: addPathParamToUrl(CATALOGUE_PATH, {}),
    });
  }, [application]);

  return (
    <EuiCard
      data-test-subj="observabilityOnboardingBrowseAllIntegrationsTile"
      titleSize="xs"
      hasBorder
      icon={
        <EuiFlexGroup
          responsive={false}
          gutterSize="s"
          justifyContent="center"
          alignItems="center"
          aria-hidden
        >
          {CHIP_LOGOS.map((logo) => (
            <EuiFlexItem key={logo} grow={false}>
              <LogoIcon
                logo={logo}
                isAvatar
                size="l"
                avatarType="space"
                hasBorder
                color={euiTheme.colors.emptyShade}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      }
      title={i18n.translate(
        'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.browseAllIntegrationsTile.title',
        { defaultMessage: 'Browse all' }
      )}
      onClick={handleClick}
    />
  );
};
