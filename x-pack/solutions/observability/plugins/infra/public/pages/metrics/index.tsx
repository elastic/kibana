/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useContext } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { EuiHeaderLinks, EuiHeaderLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  FeatureFeedbackButton,
  HeaderMenuPortal,
  useLinkProps,
} from '@kbn/observability-shared-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { dynamic } from '@kbn/shared-ux-utility';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { MetricsSettingsPage } from './settings';
import { MetricsAlertDropdown } from '../../alerting/common/components/metrics_alert_dropdown';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import {
  InfraMLCapabilitiesProvider,
  useInfraMLCapabilitiesContext,
} from '../../containers/ml/infra_ml_capabilities';
import { AnomalyDetectionFlyout } from '../../components/ml/anomaly_detection/anomaly_detection_flyout';
import { HeaderActionMenuContext } from '../../containers/header_action_menu_provider';
import { NotFoundPage } from '../404';
import { ReactQueryProvider } from '../../containers/react_query_provider';
import { usePluginConfig } from '../../containers/plugin_config_context';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { ReloadRequestTimeProvider } from '../../hooks/use_reload_request_time';
import { OnboardingFlow } from '../../components/shared/templates/no_data_config';
import { SurveySection } from './inventory_view/components/survey_section';
import { useKibanaEnvironmentContext } from '../../hooks/use_kibana';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});
const HOSTS_FEEDBACK_LINK = 'https://ela.st/host-feedback';
const METRICS_EXPLORER_FEEDBACK_URL = 'https://ela.st/survey-infra-metricsexplorer';

const MetricsExplorerPage = dynamic(() =>
  import('./metrics_explorer').then((mod) => ({ default: mod.MetricsExplorerPage }))
);
const SnapshotPage = dynamic(() =>
  import('./inventory_view').then((mod) => ({ default: mod.SnapshotPage }))
);
const NodeDetail = dynamic(() =>
  import('./metric_detail').then((mod) => ({ default: mod.NodeDetail }))
);
const HostsPage = dynamic(() => import('./hosts').then((mod) => ({ default: mod.HostsPage })));

export const InfrastructurePage = () => {
  const config = usePluginConfig();
  const { application } = useKibana<{ share: SharePublicStart }>().services;
  const { setHeaderActionMenu, theme$ } = useContext(HeaderActionMenuContext);

  const uiCapabilities = application?.capabilities;

  const settingsTabTitle = i18n.translate('xpack.infra.metrics.settingsTabTitle', {
    defaultMessage: 'Settings',
  });

  useReadOnlyBadge(!uiCapabilities?.infrastructure?.save);

  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });

  return (
    <KibanaErrorBoundary>
      <ReactQueryProvider>
        <AlertPrefillProvider>
          <ReloadRequestTimeProvider>
            <InfraMLCapabilitiesProvider>
              {setHeaderActionMenu && theme$ && (
                <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
                  <EuiFlexGroup responsive={false} gutterSize="s">
                    <EuiFlexItem>
                      <EuiHeaderLinks gutterSize="xs">
                        <Routes>
                          <HeaderLinkFeedbackButtonRoute path="/inventory" />
                          <HeaderLinkFeedbackButtonRoute path="/explorer" />
                          <HeaderLinkFeedbackButtonRoute path="/hosts" />
                        </Routes>
                        <Routes>
                          <HeaderLinkAnomalyFlyoutRoute path="/inventory" />
                          <HeaderLinkAnomalyFlyoutRoute path="/hosts" />
                          <HeaderLinkAnomalyFlyoutRoute path="/detail/host/:node" />
                        </Routes>
                        {config.featureFlags.alertsAndRulesDropdownEnabled && (
                          <MetricsAlertDropdown />
                        )}
                        <EuiHeaderLink color={'primary'} {...settingsLinkProps}>
                          {settingsTabTitle}
                        </EuiHeaderLink>
                        <Routes>
                          <HeaderLinkAddDataRoute
                            path="/hosts"
                            onboardingFlow={OnboardingFlow.Hosts}
                            exact
                          />
                          <HeaderLinkAddDataRoute
                            path="/detail/host/:node"
                            onboardingFlow={OnboardingFlow.Hosts}
                            exact
                          />
                          <HeaderLinkAddDataRoute path="/" onboardingFlow={OnboardingFlow.Infra} />
                        </Routes>
                      </EuiHeaderLinks>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </HeaderMenuPortal>
              )}

              <Routes enableExecutionContextTracking={true}>
                <Route path="/inventory" component={SnapshotPage} />
                {config.featureFlags.metricsExplorerEnabled && (
                  <Route path="/explorer" component={MetricsExplorerPage} />
                )}
                <Route path="/detail/:type/:node" component={NodeDetail} />
                <Route path="/hosts" component={HostsPage} />
                <Route path="/settings" component={MetricsSettingsPage} />

                <RedirectWithQueryParams from="/snapshot" exact to="/inventory" />
                <RedirectWithQueryParams from="/metrics-explorer" exact to="/explorer" />
                <RedirectWithQueryParams from="/" exact to="/inventory" />

                <Route
                  render={() => (
                    <NotFoundPage
                      title={i18n.translate('xpack.infra.header.infrastructureLabel', {
                        defaultMessage: 'Infrastructure',
                      })}
                    />
                  )}
                />
              </Routes>
            </InfraMLCapabilitiesProvider>
          </ReloadRequestTimeProvider>
        </AlertPrefillProvider>
      </ReactQueryProvider>
    </KibanaErrorBoundary>
  );
};

const HeaderLinkAnomalyFlyoutRoute = ({ path }: { path: string }) => {
  const isInventory = path !== '/inventory';
  const { isTopbarMenuVisible } = useInfraMLCapabilitiesContext();
  return (
    <Route
      path={path}
      render={() =>
        isTopbarMenuVisible ? (
          <AnomalyDetectionFlyout hideJobType={isInventory} hideSelectGroup={isInventory} />
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

const feedbackLinksPathMap = {
  '/hosts': { formUrl: HOSTS_FEEDBACK_LINK, dts: 'infraHostsPageTellUsWhatYouThinkButton' },
  '/explorer': {
    formUrl: METRICS_EXPLORER_FEEDBACK_URL,
    dts: 'infraMetricsExplorerFeedbackLink',
  },
};

const HeaderLinkFeedbackButtonRoute = ({
  path,
  exact,
}: {
  path: keyof typeof feedbackLinksPathMap | '/inventory';
  exact?: boolean;
}) => {
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();

  if (path === '/inventory') {
    return <Route path={path} exact={exact} render={() => <SurveySection />} />;
  }

  return (
    <Route
      path={path}
      exact={exact}
      render={() => (
        <FeatureFeedbackButton
          data-test-subj={feedbackLinksPathMap[path]?.dts ?? 'infraInventoryFeedbackLink'}
          formUrl={feedbackLinksPathMap[path]?.formUrl}
          kibanaVersion={kibanaVersion}
          isCloudEnv={isCloudEnv}
          isServerlessEnv={isServerlessEnv}
          sanitizedPath={path}
        />
      )}
    />
  );
};
