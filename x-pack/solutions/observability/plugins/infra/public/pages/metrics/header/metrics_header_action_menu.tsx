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
import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { MetricsAlertDropdown } from '../../../alerting/common/components/metrics_alert_dropdown';
import { InspectorHeaderLink } from '../../../components/inspector_header_link';
import { AnomalyDetectionFlyout } from '../../../components/ml/anomaly_detection/anomaly_detection_flyout';
import { OnboardingFlow } from '../../../components/shared/templates/no_data_config';
import { usePluginConfig } from '../../../containers/plugin_config_context';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import {
  METRICS_DETAIL_PATH,
  METRICS_HOSTS_PATH,
  METRICS_INVENTORY_PATH,
} from './metrics_header_paths';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

const SETTINGS_TAB_TITLE = i18n.translate('xpack.infra.metrics.settingsTabTitle', {
  defaultMessage: 'Settings',
});

/**
 * Legacy Chrome action strip for Metrics routes that have not migrated to AppHeader.
 */
export const MetricsHeaderActionMenu = (): React.ReactElement => {
  const config = usePluginConfig();
  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });

  return (
    <EuiFlexGroup responsive={false} gutterSize="s">
      <EuiFlexItem>
        <EuiHeaderLinks gutterSize="xs">
          <Routes>
            <HeaderLinkAnomalyFlyoutRoute path={METRICS_INVENTORY_PATH} />
            <HeaderLinkAnomalyFlyoutRoute path={METRICS_HOSTS_PATH} />
            <HeaderLinkAnomalyFlyoutRoute path={`${METRICS_DETAIL_PATH}/host/:node`} />
          </Routes>
          {config.featureFlags.alertsAndRulesDropdownEnabled && <MetricsAlertDropdown />}
          <EuiHeaderLink color="primary" {...settingsLinkProps}>
            {SETTINGS_TAB_TITLE}
          </EuiHeaderLink>
          <InspectorHeaderLink />
          <Routes>
            <HeaderLinkAddDataRoute
              path={METRICS_HOSTS_PATH}
              onboardingFlow={OnboardingFlow.Hosts}
              exact
            />
            <HeaderLinkAddDataRoute
              path={`${METRICS_DETAIL_PATH}/host/:node`}
              onboardingFlow={OnboardingFlow.Hosts}
              exact
            />
            <HeaderLinkAddDataRoute path="/" onboardingFlow={OnboardingFlow.Infra} />
          </Routes>
        </EuiHeaderLinks>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const HeaderLinkAnomalyFlyoutRoute = ({ path }: { path: string }) => {
  const hideJobTypeAndGroup = path !== METRICS_INVENTORY_PATH;
  const { isTopbarMenuVisible } = useInfraMLCapabilitiesContext();
  return (
    <Route
      path={path}
      render={() =>
        isTopbarMenuVisible ? (
          <AnomalyDetectionFlyout
            hideJobType={hideJobTypeAndGroup}
            hideSelectGroup={hideJobTypeAndGroup}
          />
        ) : null
      }
    />
  );
};

const HeaderLinkAddDataRoute = ({
  path,
  onboardingFlow,
  exact,
}: {
  path: string;
  onboardingFlow: OnboardingFlow;
  exact?: boolean;
}) => {
  const { share } = useKibana<{ share: SharePublicStart }>().services;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  return (
    <Route
      path={path}
      exact={exact}
      render={() => (
        <EuiHeaderLink
          href={onboardingLocator?.getRedirectUrl({
            category: onboardingFlow === OnboardingFlow.Hosts ? 'host' : undefined,
          })}
          color="primary"
        >
          {ADD_DATA_LABEL}
        </EuiHeaderLink>
      )}
    />
  );
};
