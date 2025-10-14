/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LazyPackageCard } from '@kbn/fleet-plugin/public';
import { css } from '@emotion/react';
import { INTEGRATION_APP_ID } from '../../../../common/lib/integrations/constants';
import { useIntegrationLinkState } from '../../../../common/hooks/integrations/use_integration_link_state';
import { addPathParamToUrl } from '../../../../common/utils/integrations';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../../common/constants';
import { useNavigation } from '../../../../common/lib/kibana';
import { useEntityAnalyticsIntegrations } from '../hooks/use_integrations';

export interface IntegrationCardsProps {
  maxCardWidth?: number;
  showInstallationStatus?: boolean;
  onIntegrationInstalled?: (count: number) => void;
  titleSize?: 'xs' | 's';
}

/**
 * This component has to be wrapped by react Suspense.
 * It suspends while loading the lazy package card and while fetching the integrations.
 */
export const IntegrationCards = ({
  onIntegrationInstalled,
  maxCardWidth,
  showInstallationStatus = false,
  titleSize = 's',
}: IntegrationCardsProps) => {
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);
  const { navigateTo } = useNavigation();
  const integrations = useEntityAnalyticsIntegrations();

  const navigateToIntegration = useCallback(
    (id: string, version: string) => {
      navigateTo({
        appId: INTEGRATION_APP_ID,
        path: addPathParamToUrl(
          `/detail/${id}-${version}/overview`,
          ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
          { prerelease: 'true' } // entityanalytics_ad is a technical preview package, delete this line when it is GA
        ),
        state,
      });
    },
    [navigateTo, state]
  );

  useEffect(() => {
    const installedIntegrations = integrations.filter(({ status }) => status === 'installed');
    if (installedIntegrations.length > 0) {
      onIntegrationInstalled?.(0); // We can't provide the number of users installed at this point because the integration run async.
    }
  }, [integrations, onIntegrationInstalled]);

  const hasInstallationStatus = integrations.some(
    ({ status }) => status === 'installing' || status === 'install_failed' || status === 'installed'
  );

  return (
    <EuiFlexGroup direction="row">
      {integrations.map(({ name, title, icons, description, version, status }) => (
        <EuiFlexItem
          grow={maxCardWidth ? 0 : 1}
          key={name}
          data-test-subj="entity_analytics-integration-card"
          css={css`
            max-width: ${maxCardWidth}px;
          `}
        >
          <LazyPackageCard
            description={description ?? ''}
            icons={icons ?? []}
            minCardHeight={showInstallationStatus && hasInstallationStatus ? 144 : 84}
            descriptionLineClamp={2}
            titleLineClamp={1}
            id={name}
            name={name}
            title={title}
            titleSize={titleSize}
            version={version}
            onCardClick={() => {
              navigateToIntegration(name, version);
            }}
            // Required values that don't make sense for this scenario
            categories={[]}
            integration={''}
            url={''}
            installStatus={status === 'not_installed' ? undefined : status}
            showInstallationStatus={showInstallationStatus}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
