/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import {
  type ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { dynamic } from '@kbn/shared-ux-utility';
import { safeDecode } from '@kbn/rison';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { DiscoverAppState } from '@kbn/discover-plugin/public';
import type { DiscoverGlobalState } from '@kbn/discover-plugin/public/application/main/state_management/discover_global_state_container';
import type { Filter } from '@kbn/es-query';
import { type DataViewDataSource } from '@kbn/discover-plugin/common/data_sources';
import { LazyAlertDropdownWrapper } from '../../alerting/log_threshold';
import { HelpCenterContent } from '../../components/help_center_content';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { HeaderActionMenuContext } from '../../containers/header_action_menu_provider';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { NotFoundPage } from '../404';
import { getLogsAppRoutes } from './routes';

const LogEntryCategoriesPage = dynamic(() =>
  import('./log_entry_categories').then((mod) => ({ default: mod.LogEntryCategoriesPage }))
);
const LogEntryRatePage = dynamic(() =>
  import('./log_entry_rate').then((mod) => ({ default: mod.LogEntryRatePage }))
);

export const LogsPageContent: React.FunctionComponent = () => {
  const { application, share } = useKibana<{ share: SharePublicStart }>().services;

  const uiCapabilities = application?.capabilities;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const managementLocator = share?.url.locators.get(MANAGEMENT_APP_LOCATOR);

  const { setHeaderActionMenu, theme$ } = useContext(HeaderActionMenuContext);

  useReadOnlyBadge(!uiCapabilities?.logs?.save);
  const routes = getLogsAppRoutes();

  return (
    <>
      <HelpCenterContent feedbackLink={feedbackLinkUrl} appName={pageTitle} />

      {setHeaderActionMenu && theme$ && (
        <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
          <EuiFlexGroup responsive={false} gutterSize="s">
            <EuiFlexItem>
              <EuiHeaderLinks gutterSize="xs">
                <LazyAlertDropdownWrapper />
                <EuiHeaderLink
                  href={onboardingLocator?.useUrl({ category: 'logs' })}
                  color="primary"
                  iconType="indexOpen"
                >
                  {ADD_DATA_LABEL}
                </EuiHeaderLink>
              </EuiHeaderLinks>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderMenuPortal>
      )}

      <Routes>
        <Route
          path="/stream"
          exact
          render={({ location }) => {
            const searchParams = new URLSearchParams(location.search);
            const g = searchParams.get('_g') || '';
            const a = searchParams.get('_a') || '';

            const gState = (safeDecode(g) || {}) as unknown as DiscoverGlobalState;
            const aState = (safeDecode(a) || {}) as unknown as DiscoverAppState;

            const dataViewId =
              aState.dataSource?.type === 'dataView'
                ? (aState.dataSource as DataViewDataSource).dataViewId
                : '';

            const locatorParams = {
              dataViewId,
              timeRange: gState.time || { from: 'now-15d', to: 'now' },
              filters: [
                ...(Array.isArray(gState.filters) ? gState.filters : []),
                ...(Array.isArray(aState.filters) ? aState.filters : []),
              ] as Filter[],
              query:
                aState.query && typeof aState.query === 'object'
                  ? aState.query
                  : { language: 'kuery', query: '' },
              columns: Array.isArray(aState.columns) ? aState.columns : [],
              sort: Array.isArray(aState.sort) ? aState.sort : [['@timestamp', 'desc']],
            };

            share.url.locators.get(DISCOVER_APP_LOCATOR)?.navigate(locatorParams);
            return null;
          }}
        />
        <Route path={routes.logsAnomalies.path} component={LogEntryRatePage} />
        <Route path={routes.logsCategories.path} component={LogEntryCategoriesPage} />
        <RedirectWithQueryParams from={'/analysis'} to={routes.logsAnomalies.path} exact />
        <RedirectWithQueryParams from={'/log-rate'} to={routes.logsAnomalies.path} exact />
        <RedirectWithQueryParams from={'/'} to={routes.logsAnomalies.path} exact />
        // Legacy renders and redirects
        <Route
          path="/settings"
          exact
          render={() => {
            managementLocator?.navigate({
              sectionId: 'kibana',
              appId: 'settings?query=observability%3AlogSources',
            });

            return null;
          }}
        />
        <Route render={() => <NotFoundPage title={pageTitle} />} />
      </Routes>
    </>
  );
};

const pageTitle = i18n.translate('xpack.infra.header.logsTitle', {
  defaultMessage: 'Logs',
});

const feedbackLinkUrl = 'https://discuss.elastic.co/c/logs';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.logsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});
