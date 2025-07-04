/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LazyPackageCard } from '@kbn/fleet-plugin/public';
import { INTEGRATION_APP_ID } from '../../../../common/lib/integrations/constants';
import { useIntegrationLinkState } from '../../../../common/hooks/integrations/use_integration_link_state';
import { addPathParamToUrl } from '../../../../common/utils/integrations';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../../common/constants';
import { useNavigation } from '../../../../common/lib/kibana';
import { useEntityAnalyticsIntegrations } from '../hooks/use_integrations';

/**
 * This component has to be wrapped by react Suspense.
 * It suspends while loading the lazy package card and while fetching the integrations.
 */
export const IntegrationCards = () => {
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);
  const { navigateTo } = useNavigation();
  const integrations = useEntityAnalyticsIntegrations();
  const navigateToIntegration = useCallback(
    (id: string, version: string) => {
      navigateTo({
        appId: INTEGRATION_APP_ID,
        path: addPathParamToUrl(
          `/detail/${id}-${version}/overview`,
          ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
        ),
        state,
      });
    },
    [navigateTo, state]
  );

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceBetween">
      {integrations.map(({ name, title, icons, description, version }) => (
        <EuiFlexItem grow={1} key={name} data-test-subj="entity_analytics-integration-card">
          <LazyPackageCard
            description={description ?? ''}
            icons={icons ?? []}
            id={name}
            name={name}
            title={title}
            version={version}
            onCardClick={() => {
              navigateToIntegration(name, version);
            }}
            // Required values that don't make sense for this scenario
            categories={[]}
            integration={''}
            url={''}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
