/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import {
  DASHBOARD_APP_LOCATOR,
  DISCOVER_APP_LOCATOR,
  DISCOVER_ESQL_LOCATOR,
} from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type {
  DiscoverAppLocatorParams,
  DiscoverESQLLocatorParams,
} from '@kbn/discover-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useEventsIndexFlyout } from '../components/shared/events_index_flyout_context';
import { useWebCrawlFlyout } from '../components/shared/web_crawl_flyout_context';
import { useFileUploadFlyout } from './use_file_upload_flyout';
import {
  ANALYTICS_AGENT_SESSION_TAG,
  ANALYTICS_TELEMETRY_PREFIX,
  GUIDED_SETUP_PATH,
  HOME_PATH,
  STARTER_QUERY_TIME_RANGE,
} from '../constants';
import { canOpenPageConsole, openPageConsole } from '../console_usage';
import { buildSearchRequestExample } from '../search_request_example';
import { withAutoRefresh } from '../dashboard_refresh';
import { buildGeneratedDashboardParams, buildSourceDashboardParams } from '../starter_dashboard';
import type { AnalyticsLinks, AnalyticsSource, AnalyticsSourceTarget } from '../types';

const INTEGRATIONS_APP_ID = 'integrations';
const INTEGRATIONS_BROWSE_PATH = '/browse';
const DATA_FEDERATION_NAV_LINK_ID = 'management:data_federation';
const INDEX_MANAGEMENT_LOCATOR_ID = 'SEARCH_INDEX_MANAGEMENT_LOCATOR_ID';
const HOME_APP_ID = 'home';
const FILE_UPLOAD_PATH = '#/tutorial_directory/fileDataViz';
const SAMPLE_DATA_PATH = '#/tutorial_directory/sampleData';

type IntegrationsTarget = Extract<
  AnalyticsSourceTarget,
  { type: 'integrationSearch' | 'integrationCategory' | 'integrationCreate' }
>;

/** Path inside the Integrations app for a source that links to it. */
export const getIntegrationsPath = (target: IntegrationsTarget): string => {
  switch (target.type) {
    case 'integrationSearch':
      return `${INTEGRATIONS_BROWSE_PATH}?q=${encodeURIComponent(target.searchTerm)}`;
    case 'integrationCategory':
      return `${INTEGRATIONS_BROWSE_PATH}/${target.categoryPath}`;
    case 'integrationCreate':
      return '/create';
  }
};

/** Navigation and capability checks for everything the home and the guided setup link to. */
export const useAnalyticsLinks = (): AnalyticsLinks => {
  const {
    agentBuilder,
    application,
    chrome,
    console: consolePlugin,
    history,
    notifications,
    settings,
    share,
    usageCollection,
  } = useKibana().services;
  const { capabilities } = application;
  const webCrawlFlyout = useWebCrawlFlyout();
  const eventsIndexFlyout = useEventsIndexFlyout();
  const fileUploadFlyout = useFileUploadFlyout();

  const canUseIntegrations = capabilities.fleet?.read === true;
  const canUseDiscover = capabilities.discover_v2?.show === true;
  const canCreateDashboard = capabilities.dashboard_v2?.createNew === true;
  const canShowDashboards = capabilities.dashboard_v2?.show === true;
  const canShowAgentBuilder =
    agentBuilder !== undefined && capabilities.agentBuilder?.show === true;

  const chatExperience$ = useMemo(
    () =>
      canShowAgentBuilder ? settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE) : EMPTY,
    [canShowAgentBuilder, settings]
  );
  const chatExperience = useObservable(chatExperience$);
  const canOpenAgentChat = canShowAgentBuilder && chatExperience === AIChatExperience.Agent;

  return useMemo(() => {
    const reportClick = (id: string): void => {
      usageCollection?.reportUiCounter(
        'searchHomepage',
        METRIC_TYPE.CLICK,
        `${ANALYTICS_TELEMETRY_PREFIX}_${id}`
      );
    };

    const showNavigationError = (error: Error): void => {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.searchHomepage.analytics.links.navigationErrorTitle', {
          defaultMessage: 'Unable to open the page',
        }),
      });
    };

    const navigateToIntegrations = (path: string): void => {
      if (!canUseIntegrations) return;
      application.navigateToApp(INTEGRATIONS_APP_ID, { path }).catch(showNavigationError);
    };

    const browseIntegrations = (): void => {
      reportClick('browse_integrations');
      navigateToIntegrations(INTEGRATIONS_BROWSE_PATH);
    };

    const isEmbeddedConsoleAvailable = (): boolean => canOpenPageConsole(consolePlugin);

    const openConsole = (content: string): void => {
      if (openPageConsole(consolePlugin, content)) {
        return;
      }
      application.navigateToApp('dev_tools').catch(showNavigationError);
    };

    const openApiTutorial = (): void => {
      import('@kbn/search-code-examples')
        .then(({ consoleTutorials }) => openConsole(consoleTutorials.basics))
        .catch(showNavigationError);
    };

    const indexManagementLocator = share.url.locators.get(INDEX_MANAGEMENT_LOCATOR_ID);

    const isSourceAvailable: AnalyticsLinks['isSourceAvailable'] = ({ target: { type } }) => {
      switch (type) {
        case 'createIndex':
          return indexManagementLocator !== undefined;
        case 'apiTutorial':
          return isEmbeddedConsoleAvailable();
        case 'webCrawl':
          return webCrawlFlyout.isAvailable;
        case 'eventsIndex':
          return eventsIndexFlyout.isAvailable;
        default:
          return true;
      }
    };

    const sourceOpensDialog: AnalyticsLinks['sourceOpensDialog'] = ({ target: { type } }) => {
      switch (type) {
        case 'webCrawl':
        case 'eventsIndex':
          return true;
        case 'fileUpload':
          return fileUploadFlyout.isAvailable;
        default:
          return false;
      }
    };

    const openFileUploadPage = (): void => {
      application.navigateToApp(HOME_APP_ID, { path: FILE_UPLOAD_PATH }).catch(showNavigationError);
    };

    const openFileUpload = (opener?: HTMLElement | null): void => {
      if (!fileUploadFlyout.isAvailable) {
        openFileUploadPage();
        return;
      }
      fileUploadFlyout.open(opener).catch(openFileUploadPage);
    };

    const openDataFederation = (): void => {
      const dataFederationLink = chrome.navLinks.get(DATA_FEDERATION_NAV_LINK_ID);
      if (dataFederationLink) {
        application.navigateToUrl(dataFederationLink.href).catch(showNavigationError);
        return;
      }
      navigateToIntegrations(INTEGRATIONS_BROWSE_PATH);
    };

    const openSource = ({ id, target }: AnalyticsSource, opener?: HTMLElement | null): void => {
      reportClick(`open_source_${id}`);
      switch (target.type) {
        case 'fileUpload':
          openFileUpload(opener);
          return;
        case 'sampleDataDirectory':
          application
            .navigateToApp(HOME_APP_ID, { path: SAMPLE_DATA_PATH })
            .catch(showNavigationError);
          return;
        case 'apiTutorial':
          openApiTutorial();
          return;
        case 'dataFederation':
          openDataFederation();
          return;
        case 'createIndex':
          indexManagementLocator?.navigate({ page: 'index_list' }).catch(showNavigationError);
          return;
        case 'externalUrl':
          window.open(target.url, '_blank', 'noopener,noreferrer');
          return;
        case 'webCrawl':
          webCrawlFlyout.open(opener);
          return;
        case 'eventsIndex':
          eventsIndexFlyout.open(opener);
          return;
        default:
          navigateToIntegrations(getIntegrationsPath(target));
      }
    };

    const openDiscover = (esql?: string): void => {
      reportClick(esql ? 'open_discover_query' : 'open_discover');
      if (!canUseDiscover) return;

      const { locators } = share.url;
      const navigation = esql
        ? locators
            .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
            ?.navigate({ query: { esql }, timeRange: STARTER_QUERY_TIME_RANGE })
        : locators.get<DiscoverESQLLocatorParams>(DISCOVER_ESQL_LOCATOR)?.navigate({});

      (navigation ?? application.navigateToApp('discover')).catch(showNavigationError);
    };

    const openDashboards = (): void => {
      reportClick('open_dashboards');
      if (!canShowDashboards) return;
      application.navigateToApp('dashboards', { path: '#/list' }).catch(showNavigationError);
    };

    const openNewDashboard = (): void => {
      application.navigateToApp('dashboards', { path: '#/create' }).catch(showNavigationError);
    };

    const createDashboard = (): void => {
      reportClick('create_dashboard');
      if (!canCreateDashboard) return;
      openNewDashboard();
    };

    const createSourceDashboard: AnalyticsLinks['createSourceDashboard'] = (
      source,
      { selectedUseCaseId, generatedPanels } = {}
    ) => {
      const isGenerated = generatedPanels !== undefined && generatedPanels.length > 0;
      reportClick(isGenerated ? 'create_generated_dashboard' : 'create_source_dashboard');
      if (!canCreateDashboard) return;

      const locator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
      if (!locator) {
        openNewDashboard();
        return;
      }
      locator
        .navigate(
          withAutoRefresh(
            isGenerated
              ? buildGeneratedDashboardParams(source, generatedPanels)
              : buildSourceDashboardParams(source, selectedUseCaseId)
          )
        )
        .catch(showNavigationError);
    };

    const openDashboard = (id: string): void => {
      reportClick('open_dashboard');
      if (!canShowDashboards) return;

      const navigation =
        share.url.locators
          .get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR)
          ?.navigate({ dashboardId: id }) ??
        application.navigateToApp('dashboards', { path: `#/view/${encodeURIComponent(id)}` });

      navigation.catch(showNavigationError);
    };

    const askAgent = (message: string): void => {
      reportClick('ask_agent');
      if (!canOpenAgentChat || !agentBuilder) return;
      agentBuilder.openChat({
        initialMessage: message,
        autoSendInitialMessage: true,
        newConversation: true,
        sessionTag: ANALYTICS_AGENT_SESSION_TAG,
      });
    };

    const openSearchRequest: AnalyticsLinks['openSearchRequest'] = (source) => {
      reportClick('open_search_request');
      openConsole(buildSearchRequestExample(source?.name));
    };

    const openConnectionDetails = (): void => {
      reportClick('open_connection_details');
      import('@kbn/cloud/connection_details')
        .then(({ openWiredConnectionDetails }) => openWiredConnectionDetails())
        .catch(showNavigationError);
    };

    const openIndexDetails: AnalyticsLinks['openIndexDetails'] = (source) => {
      reportClick('open_index_details');
      indexManagementLocator
        ?.navigate(
          source?.kind === 'index'
            ? { page: 'index_details', indexName: source.name }
            : { page: 'index_list' }
        )
        .catch(showNavigationError);
    };

    return {
      canUseIntegrations,
      canUseDiscover,
      canCreateDashboard,
      canOpenAgentChat,
      canOpenIndices: indexManagementLocator !== undefined,
      isSourceAvailable,
      sourceOpensDialog,
      openSource,
      browseIntegrations,
      openDiscover,
      openDashboards,
      createDashboard,
      createSourceDashboard,
      openDashboard,
      askAgent,
      openSearchRequest,
      openConnectionDetails,
      openIndexDetails,
      openHome: () => {
        reportClick('open_home');
        history.push(HOME_PATH);
      },
      openOnboarding: () => {
        reportClick('open_onboarding');
        history.push(GUIDED_SETUP_PATH);
      },
    };
  }, [
    agentBuilder,
    application,
    canCreateDashboard,
    canOpenAgentChat,
    canShowDashboards,
    canUseDiscover,
    canUseIntegrations,
    chrome,
    consolePlugin,
    eventsIndexFlyout,
    fileUploadFlyout,
    history,
    notifications,
    share,
    usageCollection,
    webCrawlFlyout,
  ]);
};
