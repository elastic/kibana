/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { MetricsAlertDropdown } from '../../../alerting/common/components/metrics_alert_dropdown';
import { InspectorHeaderLink } from '../../../components/inspector_header_link';
import { AnomalyDetectionFlyout } from '../../../components/ml/anomaly_detection/anomaly_detection_flyout';
import { usePluginConfig } from '../../../containers/plugin_config_context';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import { getMetricsHeaderMenuVisibility } from './get_metrics_header_menu_visibility';
import { isMetricsInventoryPath } from './metrics_header_paths';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

const SETTINGS_TAB_TITLE = i18n.translate('xpack.infra.metrics.settingsTabTitle', {
  defaultMessage: 'Settings',
});

/**
 * Legacy Chrome action strip for Metrics routes that have not migrated to AppHeader.
 * Path rules come from getMetricsHeaderMenuVisibility so they stay aligned with AppHeader.
 */
export const MetricsHeaderActionMenu = (): React.ReactElement => {
  const { pathname } = useLocation();
  const visibility = getMetricsHeaderMenuVisibility(pathname);
  const config = usePluginConfig();
  const { isTopbarMenuVisible } = useInfraMLCapabilitiesContext();
  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });
  const { share } = useKibana<{ share: SharePublicStart }>().services;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const hideAnomalyJobTypeAndGroup = !isMetricsInventoryPath(pathname);

  return (
    <EuiFlexGroup responsive={false} gutterSize="s">
      <EuiFlexItem>
        <EuiHeaderLinks gutterSize="xs">
          {visibility.showAnomalyDetection && isTopbarMenuVisible ? (
            <AnomalyDetectionFlyout
              hideJobType={hideAnomalyJobTypeAndGroup}
              hideSelectGroup={hideAnomalyJobTypeAndGroup}
            />
          ) : null}
          {config.featureFlags.alertsAndRulesDropdownEnabled && <MetricsAlertDropdown />}
          <EuiHeaderLink color="primary" {...settingsLinkProps}>
            {SETTINGS_TAB_TITLE}
          </EuiHeaderLink>
          <InspectorHeaderLink />
          <EuiHeaderLink
            href={onboardingLocator?.getRedirectUrl({
              category: visibility.showHostsOnboarding ? 'host' : undefined,
            })}
            color="primary"
          >
            {ADD_DATA_LABEL}
          </EuiHeaderLink>
        </EuiHeaderLinks>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
