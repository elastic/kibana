/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useEffect } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { MetricsSettingsPage } from './settings';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { NotFoundPage } from '../404';
import { ReactQueryProvider } from '../../containers/react_query_provider';
import { usePluginConfig } from '../../containers/plugin_config_context';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { ReloadRequestTimeProvider } from '../../hooks/use_reload_request_time';
import { getMetricsHeaderAppActionsConfig } from '../../header_app_actions/header_app_actions_config';

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
  const { application, chrome } = useKibana().services;

  useEffect(() => {
    if (chrome?.setHeaderAppActionsConfig) {
      chrome.setHeaderAppActionsConfig(getMetricsHeaderAppActionsConfig());
    }
  }, [chrome]);

  const uiCapabilities = application?.capabilities;

  useReadOnlyBadge(!uiCapabilities?.infrastructure?.save);

  return (
    <KibanaErrorBoundary>
      <ReactQueryProvider>
        <AlertPrefillProvider>
          <ReloadRequestTimeProvider>
            <InfraMLCapabilitiesProvider>
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
