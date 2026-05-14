/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { LogoIcon, type SupportedLogo } from '../../shared/logo_icon';
import { addPathParamToUrl } from '../../package_list_search_form/use_card_url_rewrite';

const LOGO_STACK_OVERLAP = '-8px';

const STACKED_LOGOS: readonly SupportedLogo[] = [
  'nginx',
  'rabbitmq',
  'apache',
  'couchbase',
  'logstash',
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
      path: addPathParamToUrl('/browse/observability', {}),
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
          gutterSize="none"
          justifyContent="center"
          alignItems="center"
          aria-hidden
        >
          {STACKED_LOGOS.map((logo, index) => (
            <EuiFlexItem
              key={`${logo}-${index}`}
              grow={false}
              css={css`
                z-index: ${STACKED_LOGOS.length - index};
                margin-left: ${index === 0 ? 0 : LOGO_STACK_OVERLAP};
              `}
            >
              <LogoIcon
                logo={logo}
                isAvatar
                size="l"
                type="space"
                hasBorder
                color={euiTheme.colors.backgroundBaseSubdued}
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
