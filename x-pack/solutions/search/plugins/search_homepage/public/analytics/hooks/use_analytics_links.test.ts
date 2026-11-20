/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { createMemoryHistory } from 'history';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useKibana } from '../../hooks/use_kibana';
import { buildSearchRequestExample } from '../search_request_example';
import { GENERATED_PANELS } from '../components/shared/test_helpers';
import type { EventsIndexFlyoutApi } from '../components/shared/events_index_flyout_context';
import { EventsIndexFlyoutContext } from '../components/shared/events_index_flyout_context';
import type { WebCrawlFlyoutApi } from '../components/shared/web_crawl_flyout_context';
import { WebCrawlFlyoutContext } from '../components/shared/web_crawl_flyout_context';
import { getAnalyticsSources } from '../sources';
import type { AnalyticsEventSource, AnalyticsSource, AnalyticsSourceTarget } from '../types';
import { getIntegrationsPath, useAnalyticsLinks } from './use_analytics_links';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const ALL_CAPABILITIES = {
  fleet: { read: true },
  discover_v2: { show: true },
  dashboard_v2: { show: true, createNew: true },
  agentBuilder: { show: true },
};

const sourceWithTarget = (target: AnalyticsSourceTarget): AnalyticsSource => ({
  id: 'test',
  group: 'streaming',
  title: 'Test',
  description: 'Test',
  iconType: 'globe',
  target,
});

const EVENT_SOURCE: AnalyticsEventSource = {
  name: 'app-events',
  kind: 'dataStream',
  dataKind: 'events',
  documentsCount: 10,
  timeField: '@timestamp',
  isSampleData: false,
};

describe('getIntegrationsPath', () => {
  it('builds the path for each integrations target', () => {
    expect(getIntegrationsPath({ type: 'integrationSearch', searchTerm: 'event hub' })).toBe(
      '/browse?q=event%20hub'
    );
    expect(
      getIntegrationsPath({
        type: 'integrationCategory',
        categoryPath: 'observability/message_queue',
      })
    ).toBe('/browse/observability/message_queue');
    expect(getIntegrationsPath({ type: 'integrationCreate' })).toBe('/create');
  });
});

describe('useAnalyticsLinks', () => {
  const setup = ({
    capabilities = ALL_CAPABILITIES,
    chatExperience = AIChatExperience.Agent,
    hasAgentBuilder = true,
    hasLocators = true,
    isEmbeddedConsoleAvailable = true,
    dataFederationHref,
    hasFileUploadFlyout = false,
    webCrawlFlyout,
    eventsIndexFlyout,
  }: {
    capabilities?: Record<string, Record<string, boolean>>;
    chatExperience?: AIChatExperience;
    hasAgentBuilder?: boolean;
    hasLocators?: boolean;
    isEmbeddedConsoleAvailable?: boolean;
    dataFederationHref?: string;
    hasFileUploadFlyout?: boolean;
    webCrawlFlyout?: WebCrawlFlyoutApi;
    eventsIndexFlyout?: EventsIndexFlyoutApi;
  } = {}) => {
    const core = coreMock.createStart();
    const navigate = jest.fn().mockResolvedValue(undefined);
    const getLocator = jest.fn((id: string) => (hasLocators ? { id, navigate } : undefined));
    const openChat = jest.fn();
    const openEmbeddedConsole = jest.fn();
    const reportUiCounter = jest.fn();
    const executeTriggerActions = jest.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const history = createMemoryHistory({ initialEntries: ['/analytics'] });

    core.application.navigateToApp.mockResolvedValue(undefined);
    core.application.navigateToUrl.mockResolvedValue(undefined);
    const navLinkHrefs: Record<string, string | undefined> = {
      'management:data_federation': dataFederationHref,
    };
    core.chrome.navLinks.get.mockImplementation((id: string) => {
      const href = navLinkHrefs[id];
      return href
        ? { id, title: id, baseUrl: '/app/management', url: href, href, visibleIn: [] }
        : undefined;
    });
    core.settings.client.get$.mockReturnValue(of(chatExperience));

    mockUseKibana.mockReturnValue({
      services: {
        ...core,
        application: { ...core.application, capabilities },
        agentBuilder: hasAgentBuilder ? { openChat } : undefined,
        console: {
          openEmbeddedConsole,
          isEmbeddedConsoleAvailable: () => isEmbeddedConsoleAvailable,
        },
        history,
        share: { url: { locators: { get: getLocator } } },
        uiActions: { hasAction: () => hasFileUploadFlyout, executeTriggerActions },
        usageCollection: { reportUiCounter },
      },
    });

    const withEventsIndexFlyout = (children: React.ReactNode): React.ReactNode =>
      eventsIndexFlyout === undefined
        ? children
        : React.createElement(
            EventsIndexFlyoutContext.Provider,
            { value: eventsIndexFlyout },
            children
          );

    const { result } = renderHook(() => useAnalyticsLinks(), {
      wrapper: ({ children }: PropsWithChildren) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          webCrawlFlyout === undefined
            ? withEventsIndexFlyout(children)
            : React.createElement(
                WebCrawlFlyoutContext.Provider,
                { value: webCrawlFlyout },
                withEventsIndexFlyout(children)
              )
        ),
    });

    return {
      links: result.current,
      application: core.application,
      executeTriggerActions,
      getLocator,
      history,
      navigate,
      openChat,
      openEmbeddedConsole,
      reportUiCounter,
      toasts: core.notifications.toasts,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens every catalog source somewhere', async () => {
    const windowOpen = jest.spyOn(window, 'open').mockReturnValue(null);
    const { links, application, navigate, openEmbeddedConsole } = setup();

    // The website crawl and the events index open on the page, and only where their flyout is provided.
    const sources = getAnalyticsSources().filter(
      ({ target }) => target.type !== 'webCrawl' && target.type !== 'eventsIndex'
    );
    for (const source of sources) {
      expect(links.isSourceAvailable(source)).toBe(true);
      links.openSource(source);
    }
    // The API tutorial is loaded on demand.
    await waitFor(() => expect(openEmbeddedConsole).toHaveBeenCalledTimes(1));

    expect(
      application.navigateToApp.mock.calls.length +
        application.navigateToUrl.mock.calls.length +
        navigate.mock.calls.length +
        openEmbeddedConsole.mock.calls.length +
        windowOpen.mock.calls.length
    ).toBe(sources.length);
  });

  describe('website crawl', () => {
    const webCrawlSource = sourceWithTarget({ type: 'webCrawl' });

    it('is unavailable and opens nothing where no crawl flyout is provided', () => {
      const windowOpen = jest.spyOn(window, 'open').mockReturnValue(null);
      const { links, application } = setup();

      expect(links.isSourceAvailable(webCrawlSource)).toBe(false);
      links.openSource(webCrawlSource);

      expect(application.navigateToApp).not.toHaveBeenCalled();
      expect(windowOpen).not.toHaveBeenCalled();
    });

    it('opens the crawl flyout and hands it the control that asked', () => {
      const open = jest.fn();
      const { links, application } = setup({ webCrawlFlyout: { isAvailable: true, open } });
      const opener = document.createElement('button');

      expect(links.isSourceAvailable(webCrawlSource)).toBe(true);
      links.openSource(webCrawlSource, opener);

      expect(open).toHaveBeenCalledWith(opener);
      expect(application.navigateToApp).not.toHaveBeenCalled();
    });
  });

  describe('events index', () => {
    const eventsIndexSource = sourceWithTarget({ type: 'eventsIndex' });

    it('is unavailable and opens nothing where no flyout is provided', () => {
      const { links, application } = setup();

      expect(links.isSourceAvailable(eventsIndexSource)).toBe(false);
      links.openSource(eventsIndexSource);

      expect(application.navigateToApp).not.toHaveBeenCalled();
    });

    it('opens the flyout and hands it the control that asked', () => {
      const open = jest.fn();
      const { links, application } = setup({ eventsIndexFlyout: { isAvailable: true, open } });
      const opener = document.createElement('button');

      expect(links.isSourceAvailable(eventsIndexSource)).toBe(true);
      expect(links.sourceOpensDialog(eventsIndexSource)).toBe(true);
      links.openSource(eventsIndexSource, opener);

      expect(open).toHaveBeenCalledWith(opener);
      expect(application.navigateToApp).not.toHaveBeenCalled();
    });
  });

  it('opens the search content sources where they live', async () => {
    const windowOpen = jest.spyOn(window, 'open').mockReturnValue(null);
    const { links, application, navigate, openEmbeddedConsole } = setup();

    links.openSource(sourceWithTarget({ type: 'createIndex' }));
    expect(navigate).toHaveBeenCalledWith({ page: 'index_list' });

    links.openSource(sourceWithTarget({ type: 'sampleDataDirectory' }));
    expect(application.navigateToApp).toHaveBeenCalledWith('home', {
      path: '#/tutorial_directory/sampleData',
    });

    links.openSource(sourceWithTarget({ type: 'externalUrl', url: 'https://example.com/crawler' }));
    expect(windowOpen).toHaveBeenCalledWith(
      'https://example.com/crawler',
      '_blank',
      'noopener,noreferrer'
    );

    links.openSource(sourceWithTarget({ type: 'apiTutorial' }));
    await waitFor(() => expect(openEmbeddedConsole).toHaveBeenCalledTimes(1));
    expect(openEmbeddedConsole.mock.calls[0][0]).toContain('kibana_sample_data_basics');
  });

  it('reports the sources whose destination this deployment lacks', () => {
    const { links } = setup({ hasLocators: false, isEmbeddedConsoleAvailable: false });

    expect(links.canOpenIndices).toBe(false);
    expect(links.isSourceAvailable(sourceWithTarget({ type: 'createIndex' }))).toBe(false);
    expect(links.isSourceAvailable(sourceWithTarget({ type: 'apiTutorial' }))).toBe(false);
    expect(links.isSourceAvailable(sourceWithTarget({ type: 'fileUpload' }))).toBe(true);
    expect(links.isSourceAvailable(sourceWithTarget({ type: 'gettingStarted' }))).toBe(true);
  });

  it('opens a search request for the source in the embedded console', () => {
    const { links, openEmbeddedConsole } = setup();

    links.openSearchRequest({ ...EVENT_SOURCE, name: 'product-catalog', dataKind: 'search' });
    links.openSearchRequest(undefined);

    expect(openEmbeddedConsole.mock.calls[0][0]).toBe(buildSearchRequestExample('product-catalog'));
    expect(openEmbeddedConsole.mock.calls[0][0].startsWith('GET product-catalog/_search\n')).toBe(
      true
    );
    expect(openEmbeddedConsole.mock.calls[1][0].startsWith('GET _search\n')).toBe(true);
  });

  it('opens an index in Index Management, and the index list for a data stream', () => {
    const { links, navigate } = setup();

    links.openIndexDetails({ ...EVENT_SOURCE, name: 'product-catalog', kind: 'index' });
    links.openIndexDetails(EVENT_SOURCE);

    expect(links.canOpenIndices).toBe(true);
    expect(navigate).toHaveBeenNthCalledWith(1, {
      page: 'index_details',
      indexName: 'product-catalog',
    });
    expect(navigate).toHaveBeenNthCalledWith(2, { page: 'index_list' });
  });

  it('opens an integration search in the Integrations app and counts the click', () => {
    const { links, application, reportUiCounter } = setup();

    links.openSource(sourceWithTarget({ type: 'integrationSearch', searchTerm: 'kafka' }));

    expect(application.navigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/browse?q=kafka',
    });
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'click',
      'searchHomepageAnalytics_open_source_test'
    );
  });

  it('browses all integrations', () => {
    const { links, application } = setup();

    links.browseIntegrations();

    expect(application.navigateToApp).toHaveBeenCalledWith('integrations', { path: '/browse' });
  });

  it('withholds integrations from a user without the Integrations privilege', () => {
    const { links, application } = setup({
      capabilities: { ...ALL_CAPABILITIES, fleet: { read: false } },
    });

    links.browseIntegrations();
    links.openSource(sourceWithTarget({ type: 'integrationCreate' }));

    expect(links.canUseIntegrations).toBe(false);
    expect(application.navigateToApp).not.toHaveBeenCalled();
  });

  describe('file upload', () => {
    const fileUploadSource = sourceWithTarget({ type: 'fileUpload' });
    const FILE_UPLOAD_PAGE = ['home', { path: '#/tutorial_directory/fileDataViz' }];

    it('opens the file upload flyout on the page', () => {
      const { links, application, executeTriggerActions } = setup({ hasFileUploadFlyout: true });

      expect(links.isSourceAvailable(fileUploadSource)).toBe(true);
      expect(links.sourceOpensDialog(fileUploadSource)).toBe(true);
      links.openSource(fileUploadSource, document.createElement('button'));

      expect(executeTriggerActions).toHaveBeenCalledWith(
        'OPEN_FILE_UPLOAD_LITE_TRIGGER',
        expect.objectContaining({ location: 'search-homepage' })
      );
      expect(application.navigateToApp).not.toHaveBeenCalled();
    });

    it('opens the file upload page where there is no flyout', () => {
      const { links, application, executeTriggerActions } = setup();

      expect(links.isSourceAvailable(fileUploadSource)).toBe(true);
      expect(links.sourceOpensDialog(fileUploadSource)).toBe(false);
      links.openSource(fileUploadSource);

      expect(executeTriggerActions).not.toHaveBeenCalled();
      expect(application.navigateToApp).toHaveBeenCalledWith(...FILE_UPLOAD_PAGE);
    });

    it('opens the file upload page when the flyout fails to open', async () => {
      const { links, application, executeTriggerActions } = setup({ hasFileUploadFlyout: true });
      executeTriggerActions.mockRejectedValue(new Error('no flyout'));

      links.openSource(fileUploadSource);

      await waitFor(() =>
        expect(application.navigateToApp).toHaveBeenCalledWith(...FILE_UPLOAD_PAGE)
      );
    });
  });

  it('says which sources open a dialog on the page', () => {
    const { links } = setup();

    expect(links.sourceOpensDialog(sourceWithTarget({ type: 'webCrawl' }))).toBe(true);
    expect(links.sourceOpensDialog(sourceWithTarget({ type: 'gettingStarted' }))).toBe(false);
  });

  it('opens the getting started page for sending data with the API', () => {
    const { links, application, openEmbeddedConsole } = setup();

    links.openSource(sourceWithTarget({ type: 'gettingStarted' }));

    expect(application.navigateToApp).toHaveBeenCalledWith('searchGettingStarted');
    expect(openEmbeddedConsole).not.toHaveBeenCalled();
  });

  it('opens data federation through its navigation link', () => {
    const href = '/app/management/kibana/data_federation';
    const { links, application } = setup({ dataFederationHref: href });

    links.openSource(sourceWithTarget({ type: 'dataFederation' }));

    expect(application.navigateToUrl).toHaveBeenCalledWith(href);
  });

  it('browses integrations when data federation is not available', () => {
    const { links, application } = setup();

    links.openSource(sourceWithTarget({ type: 'dataFederation' }));

    expect(application.navigateToUrl).not.toHaveBeenCalled();
    expect(application.navigateToApp).toHaveBeenCalledWith('integrations', { path: '/browse' });
  });

  it('opens Discover with the query and a week of data', () => {
    const { links, getLocator, navigate } = setup();

    links.openDiscover('FROM events | LIMIT 10');

    expect(getLocator).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
    expect(navigate).toHaveBeenCalledWith({
      query: { esql: 'FROM events | LIMIT 10' },
      timeRange: { from: 'now-7d', to: 'now' },
    });
  });

  it('opens Discover in ES|QL mode with its default query when none is given', () => {
    const { links, getLocator, navigate } = setup();

    links.openDiscover();

    expect(getLocator).toHaveBeenCalledWith('DISCOVER_ESQL_LOCATOR');
    expect(navigate).toHaveBeenCalledWith({});
  });

  it('opens the Discover app when its locator is not registered', () => {
    const { links, application } = setup({ hasLocators: false });

    links.openDiscover('FROM events');

    expect(application.navigateToApp).toHaveBeenCalledWith('discover');
  });

  it('withholds Discover from a user without the Discover privilege', () => {
    const { links, navigate, application } = setup({
      capabilities: { ...ALL_CAPABILITIES, discover_v2: { show: false } },
    });

    links.openDiscover('FROM events');

    expect(links.canUseDiscover).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(application.navigateToApp).not.toHaveBeenCalled();
  });

  it('opens the dashboard list and a new dashboard', () => {
    const { links, application } = setup();

    links.openDashboards();
    links.createDashboard();

    expect(application.navigateToApp).toHaveBeenNthCalledWith(1, 'dashboards', { path: '#/list' });
    expect(application.navigateToApp).toHaveBeenNthCalledWith(2, 'dashboards', {
      path: '#/create',
    });
  });

  it('opens a dashboard with panels over an event source and counts the click', () => {
    const { links, getLocator, navigate, reportUiCounter } = setup();

    links.createSourceDashboard(EVENT_SOURCE);

    expect(getLocator).toHaveBeenCalledWith('DASHBOARD_APP_LOCATOR');
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'app-events overview',
        viewMode: 'edit',
        panels: expect.any(Array),
        refresh_interval: { pause: false, value: 30_000 },
      })
    );
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'click',
      'searchHomepageAnalytics_create_source_dashboard'
    );
  });

  it('orders the built-in panels by the selected use case', () => {
    const { links, navigate } = setup();
    const source: AnalyticsEventSource = {
      ...EVENT_SOURCE,
      fields: {
        action: { name: 'event_type', label: 'event type' },
        actors: [{ name: 'player_id', label: 'player', kind: 'player' }],
        measures: [{ name: 'amount', label: 'amount', kind: 'money' }],
        dimensions: [{ name: 'status', label: 'status', kind: 'status' }],
      },
    };

    links.createSourceDashboard(source);
    links.createSourceDashboard(source, { selectedUseCaseId: 'transactions' });

    const [inferred, selected] = navigate.mock.calls.map(([{ panels }]) => JSON.stringify(panels));
    expect(selected).not.toBe(inferred);
  });

  it('opens the generated panels when they are given, as valid Lens configurations', () => {
    const { links, navigate, reportUiCounter } = setup();

    links.createSourceDashboard(EVENT_SOURCE, {
      selectedUseCaseId: 'gaming',
      generatedPanels: GENERATED_PANELS,
    });

    const [{ panels, title, viewMode, time_range: timeRange, refresh_interval: refresh }] =
      navigate.mock.calls[0];
    expect({ title, viewMode, timeRange, refresh }).toEqual({
      title: 'app-events overview',
      viewMode: 'edit',
      timeRange: { from: 'now-7d', to: 'now' },
      refresh: { pause: false, value: 30_000 },
    });
    expect(panels).toHaveLength(3);
    expect(panels.map(({ grid }: { grid: object }) => grid)).toEqual(
      GENERATED_PANELS.map(({ grid }) => grid)
    );
    for (const panel of panels) {
      expect(panel.type).toBe('vis');
      expect(lensApiConfigSchema.safeParse(panel.config).error).toBeUndefined();
    }
    expect(panels[2].config).toMatchObject({
      type: 'xy',
      title: 'Declines over time by method',
      layers: [
        {
          type: 'bar_stacked',
          x: { column: 'bucket' },
          y: [{ column: 'declines', label: 'Declines' }],
          breakdown_by: { column: 'method' },
        },
      ],
    });
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'click',
      'searchHomepageAnalytics_create_generated_dashboard'
    );
  });

  it('falls back to the built-in panels when no generated panel is given', () => {
    const { links, navigate, reportUiCounter } = setup();

    links.createSourceDashboard(EVENT_SOURCE, { generatedPanels: [] });

    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ panels: expect.any(Array) }));
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'click',
      'searchHomepageAnalytics_create_source_dashboard'
    );
  });

  it('opens an empty new dashboard when the dashboard locator is not registered', () => {
    const { links, application } = setup({ hasLocators: false });

    links.createSourceDashboard(EVENT_SOURCE);

    expect(application.navigateToApp).toHaveBeenCalledWith('dashboards', { path: '#/create' });
  });

  it('opens an existing dashboard by id and counts the click', () => {
    const { links, getLocator, navigate, reportUiCounter } = setup();

    links.openDashboard('dashboard-1');

    expect(getLocator).toHaveBeenCalledWith('DASHBOARD_APP_LOCATOR');
    expect(navigate).toHaveBeenCalledWith({ dashboardId: 'dashboard-1' });
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'click',
      'searchHomepageAnalytics_open_dashboard'
    );
  });

  it('opens an existing dashboard in the Dashboards app when the locator is not registered', () => {
    const { links, application } = setup({ hasLocators: false });

    links.openDashboard('a/b');

    expect(application.navigateToApp).toHaveBeenCalledWith('dashboards', {
      path: '#/view/a%2Fb',
    });
  });

  it('withholds dashboards from a user who cannot see them', () => {
    const { links, application, navigate } = setup({
      capabilities: { ...ALL_CAPABILITIES, dashboard_v2: { show: false, createNew: false } },
    });

    links.openDashboard('dashboard-1');
    links.openDashboards();

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a toast when a dashboard cannot be opened', async () => {
    const { links, navigate, toasts } = setup();
    const error = new Error('navigation failed');
    navigate.mockRejectedValueOnce(error);

    links.openDashboard('dashboard-1');
    await Promise.resolve();
    await Promise.resolve();

    expect(toasts.addError).toHaveBeenCalledWith(error, { title: 'Unable to open the page' });
  });

  it('withholds dashboard creation from a user who cannot create dashboards', () => {
    const { links, application, navigate } = setup({
      capabilities: { ...ALL_CAPABILITIES, dashboard_v2: { show: true, createNew: false } },
    });
    links.createDashboard();
    links.createSourceDashboard(EVENT_SOURCE);

    expect(links.canCreateDashboard).toBe(false);
    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends the message to a new agent conversation', () => {
    const { links, openChat } = setup();

    links.askAgent('Build a dashboard');

    expect(links.canOpenAgentChat).toBe(true);
    expect(openChat).toHaveBeenCalledWith({
      initialMessage: 'Build a dashboard',
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'searchHomepage-analytics',
    });
  });

  it.each([
    ['the Agent Builder plugin is missing', { hasAgentBuilder: false }],
    [
      'the user lacks the Agent Builder privilege',
      { capabilities: { ...ALL_CAPABILITIES, agentBuilder: { show: false } } },
    ],
    ['the chat experience is not Agent', { chatExperience: AIChatExperience.Classic }],
  ])('withholds the agent when %s', (_, options) => {
    const { links, openChat } = setup(options);

    links.askAgent('Build a dashboard');

    expect(links.canOpenAgentChat).toBe(false);
    expect(openChat).not.toHaveBeenCalled();
  });

  it('moves between the analytics pages with the router history', () => {
    const { links, history } = setup();

    links.openOnboarding();
    expect(history.location.pathname).toBe('/get_started');

    links.openHome();
    expect(history.location.pathname).toBe('/');
  });

  it('shows a toast when navigation fails', async () => {
    const { links, application, toasts } = setup();
    const error = new Error('navigation failed');
    application.navigateToApp.mockRejectedValueOnce(error);

    links.browseIntegrations();
    await Promise.resolve();
    await Promise.resolve();

    expect(toasts.addError).toHaveBeenCalledWith(error, { title: 'Unable to open the page' });
  });
});
