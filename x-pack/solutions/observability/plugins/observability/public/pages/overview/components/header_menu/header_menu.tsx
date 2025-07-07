/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useKibana } from '../../../../utils/kibana_react';
import { InspectorHeaderLink } from '../../../alert_details/components/inspector_header_link';

export function HeaderMenu(): React.ReactElement | null {
  const { share, theme, http } = useKibana().services;

  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const href = onboardingLocator?.useUrl({});
  const { pricing } = useKibana().services;
  const isCompleteOverviewEnabled = pricing.isFeatureAvailable('observability:complete_overview');

  const { appMountParameters } = usePluginContext();

  return (
    <HeaderMenuPortal
      setHeaderActionMenu={appMountParameters?.setHeaderActionMenu!}
      theme$={theme.theme$}
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <EuiHeaderLinks gutterSize="xs">
            {isCompleteOverviewEnabled && (
              <EuiHeaderLink
                color="primary"
                href={http.basePath.prepend('/app/observability/annotations')}
              >
                {i18n.translate('xpack.observability.home.annotations', {
                  defaultMessage: 'Annotations',
                })}
              </EuiHeaderLink>
            )}
            <EuiHeaderLink color="primary" href={href}>
              {i18n.translate('xpack.observability.home.addData', {
                defaultMessage: 'Add data',
              })}
            </EuiHeaderLink>
            <InspectorHeaderLink />
          </EuiHeaderLinks>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
