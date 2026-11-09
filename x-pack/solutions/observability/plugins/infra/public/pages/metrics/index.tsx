/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { dynamic } from '@kbn/shared-ux-utility';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { MetricsSettingsPage } from './settings';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { HeaderActionMenuContext } from '../../containers/header_action_menu_provider';
import { NotFoundPage } from '../404';
import { ReactQueryProvider } from '../../containers/react_query_provider';
import { usePluginConfig } from '../../containers/plugin_config_context';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { isMetricsHeaderPortalExcluded, MetricsHeaderActionMenu } from './header';

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
  const { pathname } = useLocation();

  const uiCapabilities = application?.capabilities;

  useReadOnlyBadge(!uiCapabilities?.infrastructure?.save);

  return (
    <KibanaErrorBoundary>
      <ReactQueryProvider>
        <AlertPrefillProvider>
          <InfraMLCapabilitiesProvider>
            {setHeaderActionMenu && theme$ && !isMetricsHeaderPortalExcluded(pathname) && (
              <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
                <MetricsHeaderActionMenu />
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
        </AlertPrefillProvider>
      </ReactQueryProvider>
    </KibanaErrorBoundary>
  );
};
