/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import { useAnalyticsLinks } from '../../hooks/use_analytics_links';
import { useChromeHidden } from '../../hooks/use_chrome_hidden';
import { useEventsOverTime } from '../../hooks/use_events_over_time';
import type { EventsOverTimeResult } from '../../hooks/use_events_over_time';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import { useSampleData } from '../../hooks/use_sample_data';
import { getSourceStarterQueries } from '../../source_queries';
import { getAnalyticsSourceGroups, getAnalyticsSources } from '../../sources';
import type {
  AnalyticsClusterStateResult,
  AnalyticsEventSource,
  AnalyticsLinks,
  AnalyticsSampleData,
  AnalyticsUseCaseId,
  ResolvedJourney,
} from '../../types';
import { getAnalyticsUseCases } from '../../use_cases';
import {
  EVENT_SOURCE,
  HAS_DASHBOARDS_STATE,
  HAS_DATA_STATE,
  MIXED_STATE,
  NO_DATA_STATE,
  SAMPLE_EVENT_SOURCE,
  SEARCH_SOURCE,
  SEARCH_STATE,
  createClusterStateResult,
  createLinksMock,
} from '../shared/test_helpers';
import { EventsOverTime } from '../shared/events_over_time';
import { UnifiedHomePage } from './unified_home';

const mockAddSuccess = jest.fn();
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addSuccess: mockAddSuccess } } } }),
}));
// The views are separate chunks in the app; here they render synchronously.
jest.mock('../lazy_views', () => ({
  LazyNoDataView: jest.requireActual('./no_data_view').NoDataView,
  LazyAnalyticsHome: jest.requireActual('./analytics_home').AnalyticsHome,
  LazySearchHome: jest.requireActual('./search_home').SearchHome,
}));
jest.mock('../../../components/search_homepage/search_homepage', () => ({
  SearchHomepagePage: () => <div data-test-subj="elasticsearchHomePage" />,
}));
jest.mock('../../hooks/use_analytics_cluster_state');
jest.mock('../../hooks/use_chrome_hidden');
jest.mock('../shared/connection_details', () => ({
  ConnectionDetails: () => <div data-test-subj="connectionDetailsStub" />,
}));
jest.mock('../../hooks/use_analytics_links');
jest.mock('../../hooks/use_analytics_preferences');
jest.mock('../../hooks/use_sample_data');
jest.mock('../../hooks/use_events_over_time');
jest.mock('../../hooks/use_source_generation');
jest.mock('../shared/events_over_time_chart', () => ({
  EventsOverTimeChart: () => <div data-test-subj="eventsOverTimeChartStub" />,
}));
jest.mock('../analytics_page_template', () => ({
  AnalyticsPageTemplate: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj': string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
}));

const mockUseAnalyticsClusterState = jest.mocked(useAnalyticsClusterState);
const mockUseAnalyticsLinks = jest.mocked(useAnalyticsLinks);
const mockUseAnalyticsPreferences = jest.mocked(useAnalyticsPreferences);
const mockUseSampleData = jest.mocked(useSampleData);
const mockUseEventsOverTime = jest.mocked(useEventsOverTime);

const install: jest.MockedFunction<AnalyticsSampleData['install']> = jest.fn();

// Stands in for the per-browser storage behind the preferences hook.
let storedJourney: ResolvedJourney | undefined;

const EVENTS_OVER_TIME: EventsOverTimeResult = {
  data: {
    from: 0,
    to: 7_200_000,
    intervalMs: 3_600_000,
    total: 3,
    buckets: [
      { timestamp: 0, count: 1 },
      { timestamp: 3_600_000, count: 2 },
    ],
  },
  isLoading: false,
  hasFailed: false,
  reportFailure: jest.fn(),
};

const OWN_SMALL_SOURCE: AnalyticsEventSource = {
  ...EVENT_SOURCE,
  name: 'my-events',
  documentsCount: 6,
};
const CLICKSTREAM_SAMPLE_SOURCE: AnalyticsEventSource = {
  ...SAMPLE_EVENT_SOURCE,
  name: 'kibana_sample_data_clickstream',
  documentsCount: 8_628,
  timeField: '@timestamp',
};

const STAGE_VIEWS = [
  'analyticsHomeLoading',
  'analyticsHomeNoData',
  'analyticsHomeHasData',
  'analyticsHomeHasDashboards',
  'analyticsHomeError',
  'elasticsearchHomePage',
];

const Page = () => (
  <EuiThemeProvider>
    <UnifiedHomePage />
  </EuiThemeProvider>
);

const setup = ({
  result = createClusterStateResult(NO_DATA_STATE),
  links = createLinksMock(),
}: {
  result?: AnalyticsClusterStateResult;
  links?: AnalyticsLinks;
} = {}) => {
  mockUseAnalyticsLinks.mockReturnValue(links);
  mockUseAnalyticsClusterState.mockReturnValue(result);
  const { rerender } = render(<Page />);

  return {
    links,
    result,
    showResult: (nextResult: AnalyticsClusterStateResult) => {
      mockUseAnalyticsClusterState.mockReturnValue(nextResult);
      rerender(<Page />);
    },
  };
};

const expectOnlyView = (viewTestSubj: string): void => {
  for (const testSubj of STAGE_VIEWS) {
    if (testSubj === viewTestSubj) {
      expect(screen.getByTestId(testSubj)).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId(testSubj)).not.toBeInTheDocument();
    }
  }
};

describe('UnifiedHomePage', () => {
  // The chart is loaded lazily; loading it once up front lets every test render it synchronously.
  beforeAll(async () => {
    mockUseEventsOverTime.mockReturnValue(EVENTS_OVER_TIME);
    const { unmount } = render(
      <EuiThemeProvider>
        <EventsOverTime page="home" headingElement="h2" sources={[EVENT_SOURCE]} totalSources={1} />
      </EuiThemeProvider>
    );
    await screen.findByTestId('eventsOverTimeChartStub');
    unmount();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    install.mockResolvedValue(true);
    mockUseSampleData.mockReturnValue({ isInstalling: false, install });
    mockUseEventsOverTime.mockReturnValue(EVENTS_OVER_TIME);
    storedJourney = undefined;
    mockUseAnalyticsPreferences.mockImplementation(() => {
      const [selectedUseCaseId, selectUseCase] = useState<AnalyticsUseCaseId>();
      const [preferredJourney, setJourney] = useState(storedJourney);
      const setPreferredJourney = (journey: ResolvedJourney): void => {
        storedJourney = journey;
        setJourney(journey);
      };
      return { selectedUseCaseId, selectUseCase, preferredJourney, setPreferredJourney };
    });
  });

  describe('stage views', () => {
    it('keeps the cluster state fresh by polling', () => {
      setup();

      expect(mockUseAnalyticsClusterState).toHaveBeenCalledWith({ poll: true });
    });

    it('shows a skeleton while the cluster state loads', () => {
      setup({ result: createClusterStateResult(undefined, { isLoading: true }) });

      expectOnlyView('analyticsHomeLoading');
    });

    it.each([
      ['analyticsHomeNoData', NO_DATA_STATE],
      ['analyticsHomeHasData', HAS_DATA_STATE],
      ['analyticsHomeHasDashboards', HAS_DASHBOARDS_STATE],
    ])('renders only %s for its stage', (viewTestSubj, state) => {
      setup({ result: createClusterStateResult(state) });

      expectOnlyView(viewTestSubj);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('keeps the example queries collapsed and offers no other journey when there are only events', () => {
      const { showResult } = setup();

      for (const state of [HAS_DATA_STATE, HAS_DASHBOARDS_STATE]) {
        showResult(createClusterStateResult(state));
        expect(screen.getByTestId('analyticsHomeUseCaseExamplesToggle')).toHaveAttribute(
          'aria-expanded',
          'false'
        );
        expect(screen.queryByTestId('analyticsHomeUseCase-gaming')).not.toBeInTheDocument();
        expect(screen.queryByTestId('analyticsHomeJourneySwitch')).not.toBeInTheDocument();
      }
    });
  });

  describe('events over time', () => {
    it('charts the selected source in hasData and follows the source picker', async () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(await screen.findByTestId('eventsOverTimeChartStub')).toBeInTheDocument();
      expect(screen.getByTestId('analyticsHomeEventsOverTimeTitle')).toHaveTextContent(
        `Events over time in ${EVENT_SOURCE.name}`
      );
      expect(mockUseEventsOverTime).toHaveBeenLastCalledWith([
        { name: EVENT_SOURCE.name, timeField: EVENT_SOURCE.timeField },
      ]);

      fireEvent.change(screen.getByTestId('analyticsHomeExploreSourcePicker'), {
        target: { value: SAMPLE_EVENT_SOURCE.name },
      });

      expect(mockUseEventsOverTime).toHaveBeenLastCalledWith([
        { name: SAMPLE_EVENT_SOURCE.name, timeField: SAMPLE_EVENT_SOURCE.timeField },
      ]);
      expect(screen.getByTestId('analyticsHomeEventsOverTimeTitle')).toHaveTextContent(
        `Events over time in ${SAMPLE_EVENT_SOURCE.name}`
      );
    });

    it('charts every listed source in hasDashboards', async () => {
      setup({ result: createClusterStateResult(HAS_DASHBOARDS_STATE) });

      expect(await screen.findByTestId('eventsOverTimeChartStub')).toBeInTheDocument();
      expect(screen.getByTestId('analyticsHomeEventsOverTimeTitle')).toHaveTextContent(
        /^Events over time$/
      );
      expect(mockUseEventsOverTime).toHaveBeenLastCalledWith([
        { name: EVENT_SOURCE.name, timeField: EVENT_SOURCE.timeField },
        { name: SAMPLE_EVENT_SOURCE.name, timeField: SAMPLE_EVENT_SOURCE.timeField },
      ]);
    });

    it('shows no chart in noData', () => {
      setup({ result: createClusterStateResult(NO_DATA_STATE) });

      expect(screen.queryByTestId('analyticsHomeEventsOverTime')).not.toBeInTheDocument();
      expect(mockUseEventsOverTime).not.toHaveBeenCalled();
    });

    it.each([
      ['hasData', HAS_DATA_STATE],
      ['hasDashboards', HAS_DASHBOARDS_STATE],
    ])('shows no chart in %s when the source has no time field', (_, state) => {
      setup({
        result: createClusterStateResult({
          ...state,
          sources: [{ ...EVENT_SOURCE, timeField: null }],
          totalSources: 1,
        }),
      });

      expect(mockUseEventsOverTime).toHaveBeenLastCalledWith([]);
      expect(screen.queryByTestId('analyticsHomeEventsOverTime')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsHomeEventsOverTimeLoading')).not.toBeInTheDocument();
    });
  });

  describe('ingest gate', () => {
    it('shows nothing but the gate, with no way onward', () => {
      const { links } = setup();

      expectOnlyView('analyticsHomeNoData');
      expect(screen.getByTestId('analyticsHomeIngestGate')).toBeInTheDocument();
      expect(screen.getAllByRole('button').map((button) => button.dataset.testSubj)).toEqual([
        'analyticsHomeFeaturedSource-api',
        'analyticsHomeFeaturedSource-fileUpload',
        'analyticsHomeFeaturedSource-eventStream',
        'analyticsHomeFeaturedSource-webCrawl',
        'analyticsHomeMoreSources',
        'analyticsHomeTrySampleEvents',
      ]);
      expect(screen.queryByTestId('analyticsHomeFooter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('searchHomeFooter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsHomeJourneySwitch')).not.toBeInTheDocument();
      expect(links.openOnboarding).not.toHaveBeenCalled();
    });

    it('names no kind of data until the data says which journey it is', () => {
      setup();

      const gate = screen.getByTestId('analyticsHomeNoData');
      expect(within(gate).getByRole('heading', { level: 1 })).toHaveTextContent('Add your data');
      expect(gate).not.toHaveTextContent(/analytics|dashboard/i);
    });

    it('offers content connectors neither as a featured tile nor in "More sources"', () => {
      setup();

      expect(screen.getByTestId('analyticsHomeNoData')).not.toHaveTextContent(
        /connector|Apache Kafka/i
      );
      expect(screen.queryByTestId('analyticsHomeFeaturedSource-kafka')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));
      const searchGroup = screen.getByTestId('analyticsHomeSourceGroup-search');
      expect(
        within(searchGroup)
          .getAllByRole('button')
          .map((tile) => tile.dataset.testSubj)
      ).toEqual([
        'analyticsHomeFlyoutSource-webCrawl',
        'analyticsHomeFlyoutSource-openWebCrawler',
        'analyticsHomeFlyoutSource-apiTutorial',
        'analyticsHomeFlyoutSource-createIndex',
      ]);
      expect(screen.getByTestId('analyticsHomeSourcesFlyout')).not.toHaveTextContent(/connector/i);
      expect(screen.getByTestId('analyticsHomeFlyoutSource-kafka')).toBeInTheDocument();
    });

    it('becomes the search home when search data arrives, and says so in a toast', () => {
      const { showResult } = setup();

      showResult(createClusterStateResult(SEARCH_STATE));

      expectOnlyView('elasticsearchHomePage');
      expect(mockAddSuccess).toHaveBeenCalledTimes(1);
      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: `Data detected in ${SEARCH_SOURCE.name}` })
      );
    });

    it('returns to the gate when the data is gone', () => {
      const { showResult } = setup({ result: createClusterStateResult(SEARCH_STATE) });

      showResult(createClusterStateResult(NO_DATA_STATE));

      expectOnlyView('analyticsHomeNoData');
    });

    it('offers the featured ways in and keeps the rest out of the page', () => {
      const { links } = setup();

      expect(
        screen
          .getAllByTestId(/^analyticsHomeFeaturedSource-/)
          .map((tile) => tile.dataset.testSubj?.replace('analyticsHomeFeaturedSource-', ''))
      ).toEqual(['api', 'fileUpload', 'eventStream', 'webCrawl']);
      expect(screen.queryByTestId('analyticsHomeSourcesFlyout')).not.toBeInTheDocument();
      expect(screen.getByTestId('analyticsHomeNoData')).not.toHaveTextContent('within seconds');
      expect(screen.queryByTestId('analyticsHomeExploreAskAgent')).not.toBeInTheDocument();

      const api = screen.getByTestId('analyticsHomeFeaturedSource-api');
      fireEvent.click(api);
      expect(links.openSource).toHaveBeenCalledWith(
        getAnalyticsSources().find(({ id }) => id === 'api'),
        api
      );
    });

    describe('event stream tile', () => {
      const getTile = (): HTMLElement =>
        screen.getByTestId('analyticsHomeFeaturedSource-eventStream');
      const getGroupIds = (): Array<string | undefined> =>
        within(screen.getByTestId('analyticsHomeSourcesFlyout'))
          .getAllByTestId(/^analyticsHomeSourceGroup-/)
          .map((group) => group.dataset.testSubj?.replace('analyticsHomeSourceGroup-', ''));

      it('is a button that announces the dialog it opens', () => {
        setup();

        const tile = getTile();
        expect(tile.tagName).toBe('BUTTON');
        expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
        expect(tile).toHaveTextContent('Set up an event stream');
        expect(tile).toHaveTextContent(
          'Connect Kafka, Kinesis, Pub/Sub or another stream of events.'
        );
        expect(screen.getByTestId('analyticsHomeFeaturedSource-api')).not.toHaveAttribute(
          'aria-haspopup'
        );
      });

      it('lists the event sources, streams first, instead of leaving the page', () => {
        const { links } = setup();

        fireEvent.click(getTile());

        expect(links.openSource).not.toHaveBeenCalled();
        const flyout = screen.getByTestId('analyticsHomeSourcesFlyout');
        expect(within(flyout).getByRole('heading', { level: 2 })).toHaveTextContent(
          'Event sources'
        );
        expect(getGroupIds()).toEqual(['streaming', 'sendEvents', 'objectStorage']);
        expect(
          within(screen.getByTestId('analyticsHomeSourceGroup-streaming'))
            .getAllByRole('button')
            .map((tile) => tile.dataset.testSubj?.replace('analyticsHomeFlyoutSource-', ''))
        ).toEqual(['kafka', 'kinesis', 'pubsub', 'eventHubs', 'messageQueues']);
        expect(screen.getByTestId('analyticsHomeFlyoutSource-httpEndpoint')).toBeInTheDocument();
        expect(screen.getByTestId('analyticsHomeFlyoutSource-s3')).toBeInTheDocument();
        expect(screen.queryByTestId('analyticsHomeSourceGroup-search')).not.toBeInTheDocument();
        expect(screen.queryByTestId('analyticsHomeFlyoutSource-webCrawl')).not.toBeInTheDocument();
      });

      it('opens Kafka from the list and closes the flyout', () => {
        const { links } = setup();

        fireEvent.click(getTile());
        fireEvent.click(screen.getByTestId('analyticsHomeFlyoutSource-kafka'));

        expect(links.openSource).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'kafka',
            target: { type: 'integrationSearch', searchTerm: 'kafka' },
          }),
          getTile()
        );
        expect(screen.queryByTestId('analyticsHomeSourcesFlyout')).not.toBeInTheDocument();
      });

      it('returns focus to the tile when the flyout closes', () => {
        setup();
        const tile = getTile();

        tile.focus();
        fireEvent.click(tile);
        screen.getByTestId('analyticsHomeSourcesFlyoutSearch').focus();
        expect(tile).not.toHaveFocus();

        fireEvent.click(screen.getByTestId('analyticsHomeSourcesFlyoutClose'));

        expect(screen.queryByTestId('analyticsHomeSourcesFlyout')).not.toBeInTheDocument();
        expect(tile).toHaveFocus();
      });

      it('lists every group again from "More sources" after the event sources were shown', () => {
        setup();

        fireEvent.click(getTile());
        fireEvent.click(screen.getByTestId('analyticsHomeSourcesFlyoutClose'));
        fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));

        expect(getGroupIds()).toEqual(getAnalyticsSourceGroups().map(({ id }) => id));
      });

      it('stays enabled without the Integrations privilege and explains the sources it lists', () => {
        const { links } = setup({ links: createLinksMock({ canUseIntegrations: false }) });

        const tile = getTile();
        expect(tile).not.toHaveAttribute('aria-disabled');
        expect(tile).not.toBeDisabled();
        fireEvent.click(tile);

        const kafka = screen.getByTestId('analyticsHomeFlyoutSource-kafka');
        expect(kafka).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(kafka);
        expect(links.openSource).not.toHaveBeenCalled();
        expect(screen.getByTestId('analyticsHomeSourcesFlyout')).toBeInTheDocument();
        expect(screen.getByTestId('analyticsHomeFlyoutSource-api')).not.toHaveAttribute(
          'aria-disabled'
        );
        expect(screen.getByTestId('analyticsHomeBrowseIntegrations')).toHaveAttribute(
          'aria-disabled',
          'true'
        );
      });
    });

    it('opens every source group in a flyout from "More sources"', () => {
      setup();

      fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));

      const flyout = screen.getByTestId('analyticsHomeSourcesFlyout');
      for (const { id, title } of getAnalyticsSourceGroups()) {
        const group = within(flyout).getByTestId(`analyticsHomeSourceGroup-${id}`);
        expect(within(group).getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
      }
    });

    it('filters the flyout by search term', () => {
      setup();
      fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));

      fireEvent.change(screen.getByTestId('analyticsHomeSourcesFlyoutSearch'), {
        target: { value: 'kafka' },
      });

      expect(screen.getByTestId('analyticsHomeFlyoutSource-kafka')).toBeInTheDocument();
      expect(screen.queryByTestId('analyticsHomeFlyoutSource-fileUpload')).not.toBeInTheDocument();

      fireEvent.change(screen.getByTestId('analyticsHomeSourcesFlyoutSearch'), {
        target: { value: 'no such source' },
      });

      expect(screen.getByTestId('analyticsHomeSourcesEmpty')).toBeInTheDocument();
    });

    it('disables integration sources without the privilege and keeps the others usable', () => {
      const { links } = setup({ links: createLinksMock({ canUseIntegrations: false }) });

      const fileUpload = screen.getByTestId('analyticsHomeFeaturedSource-fileUpload');
      expect(fileUpload).not.toHaveAttribute('aria-disabled');
      fireEvent.click(fileUpload);
      expect(links.openSource).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fileUpload' }),
        fileUpload
      );

      fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));
      const kafka = screen.getByTestId('analyticsHomeFlyoutSource-kafka');
      expect(kafka).toHaveAttribute('aria-disabled', 'true');
      expect(kafka).not.toBeDisabled();
      fireEvent.click(kafka);
      expect(links.openSource).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('analyticsHomeFlyoutSource-customIntegration')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByTestId('analyticsHomeFlyoutSource-api')).not.toHaveAttribute(
        'aria-disabled'
      );
    });

    it('closes the flyout when a source is opened from it', () => {
      const { links } = setup();

      const moreSources = screen.getByTestId('analyticsHomeMoreSources');
      fireEvent.click(moreSources);
      fireEvent.click(screen.getByTestId('analyticsHomeFlyoutSource-api'));

      expect(links.openSource).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'api' }),
        moreSources
      );
      expect(screen.queryByTestId('analyticsHomeSourcesFlyout')).not.toBeInTheDocument();
    });

    describe('file upload tile', () => {
      const getTile = (): HTMLElement =>
        screen.getByTestId('analyticsHomeFeaturedSource-fileUpload');

      it('announces a dialog where the upload opens on the page', () => {
        setup({ links: createLinksMock({ sourceOpensDialog: jest.fn(() => true) }) });

        expect(getTile()).toHaveAttribute('aria-haspopup', 'dialog');

        fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));
        expect(screen.getByTestId('analyticsHomeFlyoutSource-fileUpload')).toHaveAttribute(
          'aria-haspopup',
          'dialog'
        );
      });

      it('announces nothing where the upload leaves the page', () => {
        setup();

        expect(getTile()).not.toHaveAttribute('aria-haspopup');
      });

      it('opens from "More sources" too, handing over the button that listed the sources', () => {
        const { links } = setup();
        const moreSources = screen.getByTestId('analyticsHomeMoreSources');

        fireEvent.click(moreSources);
        fireEvent.click(screen.getByTestId('analyticsHomeFlyoutSource-fileUpload'));

        expect(screen.queryByTestId('analyticsHomeSourcesFlyout')).not.toBeInTheDocument();
        expect(links.openSource).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'fileUpload', target: { type: 'fileUpload' } }),
          moreSources
        );
      });
    });

    describe('website crawl tile', () => {
      const getTile = (): HTMLElement => screen.getByTestId('analyticsHomeFeaturedSource-webCrawl');
      const withoutWebCrawl = (): AnalyticsLinks =>
        createLinksMock({
          isSourceAvailable: jest.fn(({ target }) => target.type !== 'webCrawl'),
        });

      it('is a button that announces the dialog it opens and says what it is for', () => {
        setup();

        const tile = getTile();
        expect(tile.tagName).toBe('BUTTON');
        expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
        expect(tile).toHaveTextContent('Crawl a website');
        expect(tile).toHaveTextContent('Enter a URL and index its pages for search.');
      });

      it('opens the crawl, handing over the tile for the focus to return to', () => {
        const { links } = setup();

        fireEvent.click(getTile());

        expect(links.openSource).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'webCrawl', target: { type: 'webCrawl' } }),
          getTile()
        );
      });

      it('is left out, with three tiles in the row, where the crawl is unavailable', () => {
        setup({ links: withoutWebCrawl() });

        expect(
          screen
            .getAllByTestId(/^analyticsHomeFeaturedSource-/)
            .map((tile) => tile.dataset.testSubj?.replace('analyticsHomeFeaturedSource-', ''))
        ).toEqual(['api', 'fileUpload', 'eventStream']);

        fireEvent.click(screen.getByTestId('analyticsHomeMoreSources'));
        expect(screen.queryByTestId('analyticsHomeFlyoutSource-webCrawl')).not.toBeInTheDocument();
        expect(screen.getByTestId('analyticsHomeFlyoutSource-openWebCrawler')).toBeInTheDocument();
      });

      it('opens from "More sources" too, handing over the button that listed the sources', () => {
        const { links } = setup();
        const moreSources = screen.getByTestId('analyticsHomeMoreSources');

        fireEvent.click(moreSources);
        const listed = screen.getByTestId('analyticsHomeFlyoutSource-webCrawl');
        expect(listed).toHaveAttribute('aria-haspopup', 'dialog');
        fireEvent.click(listed);

        expect(screen.queryByTestId('analyticsHomeSourcesFlyout')).not.toBeInTheDocument();
        expect(links.openSource).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'webCrawl' }),
          moreSources
        );
      });
    });

    it('installs the sample events and re-reads the cluster state', async () => {
      const { result } = setup();

      fireEvent.click(screen.getByTestId('analyticsHomeTrySampleEvents'));

      await waitFor(() => expect(result.refetch).toHaveBeenCalledTimes(1));
      expect(install).toHaveBeenCalledWith('clickstream');
    });

    it('stays on the connect task when the sample events cannot be installed', async () => {
      install.mockResolvedValue(false);
      const { result } = setup();

      fireEvent.click(screen.getByTestId('analyticsHomeTrySampleEvents'));

      await waitFor(() => expect(install).toHaveBeenCalledWith('clickstream'));
      expect(result.refetch).not.toHaveBeenCalled();
      expectOnlyView('analyticsHomeNoData');
    });

    it('shows the connection details and hides the Kibana chrome until data arrives', () => {
      const { showResult } = setup();

      expect(screen.getByTestId('connectionDetailsStub')).toBeInTheDocument();
      expect(jest.mocked(useChromeHidden)).toHaveBeenLastCalledWith(true);

      showResult(createClusterStateResult(HAS_DATA_STATE));

      expect(screen.queryByTestId('connectionDetailsStub')).not.toBeInTheDocument();
      expect(jest.mocked(useChromeHidden)).toHaveBeenLastCalledWith(false);
    });

    it('switches to the explore view when events arrive', () => {
      const { showResult } = setup();
      expectOnlyView('analyticsHomeNoData');

      showResult(createClusterStateResult(HAS_DATA_STATE));

      expectOnlyView('analyticsHomeHasData');
      expect(screen.getByTestId('analyticsHomeEventsDetected')).toHaveTextContent(
        `Events detected in ${EVENT_SOURCE.name}`
      );
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
      expect(mockAddSuccess).not.toHaveBeenCalled();

      fireEvent.click(
        within(screen.getByTestId('analyticsHomeEventsDetected')).getByRole('button')
      );
      expect(screen.queryByTestId('analyticsHomeEventsDetected')).not.toBeInTheDocument();
    });

    it('does not announce an arrival when the page opens with events', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.queryByTestId('analyticsHomeEventsDetected')).not.toBeInTheDocument();
    });
  });

  describe('has data', () => {
    const queries = getSourceStarterQueries(EVENT_SOURCE);

    it('summarises the deployment and explores the largest source', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.getByTestId('analyticsHomeSummary')).toHaveTextContent(
        '1.3M events · 2 sources'
      );
      expect(screen.getByTestId('analyticsHomeExploreTitle')).toHaveTextContent(
        `Explore ${EVENT_SOURCE.name}`
      );

      expect(screen.getAllByTestId(/^analyticsHomeQueryCode-/)).toHaveLength(1);
      expect(screen.getAllByTestId(/^analyticsHomeQueryToggle-/)).toHaveLength(queries.length - 1);

      fireEvent.click(screen.getByTestId(`analyticsHomeOpenInDiscover-${queries[0].id}`));
      expect(links.openDiscover).toHaveBeenCalledWith(queries[0].esql);
    });

    it("defaults to the user's own source even when a sample source is larger", () => {
      setup({
        result: createClusterStateResult({
          ...HAS_DATA_STATE,
          sources: [SAMPLE_EVENT_SOURCE, CLICKSTREAM_SAMPLE_SOURCE, OWN_SMALL_SOURCE],
          totalSources: 3,
        }),
      });

      expect(screen.getByTestId('analyticsHomeExploreTitle')).toHaveTextContent(
        `Explore ${OWN_SMALL_SOURCE.name}`
      );
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Explore your events');
    });

    it('says the events are samples when every source is, and starts on the clickstream sample', () => {
      const { links } = setup({
        result: createClusterStateResult({
          ...HAS_DATA_STATE,
          sources: [SAMPLE_EVENT_SOURCE, CLICKSTREAM_SAMPLE_SOURCE],
          totalSources: 2,
        }),
      });

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Explore your sample events'
      );
      expect(screen.getByTestId('analyticsHomeExploreTitle')).toHaveTextContent(
        `Explore ${CLICKSTREAM_SAMPLE_SOURCE.name}`
      );
      fireEvent.click(screen.getByTestId('analyticsHomeBuildSourceDashboard'));
      expect(links.createSourceDashboard).toHaveBeenCalledWith(CLICKSTREAM_SAMPLE_SOURCE, {
        selectedUseCaseId: undefined,
        generatedPanels: undefined,
      });
    });

    it('says what the dashboard opens with', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.getByTestId('analyticsHomeNext')).toHaveTextContent(
        'The dashboard opens with starter panels that you can edit before saving.'
      );
    });

    it('expands another question in place of the open one', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      fireEvent.click(screen.getByTestId(`analyticsHomeQueryToggle-${queries[1].id}`));

      expect(screen.getByTestId(`analyticsHomeQueryCode-${queries[1].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`analyticsHomeQueryToggle-${queries[0].id}`)).toBeInTheDocument();
      expect(screen.getAllByTestId(/^analyticsHomeQueryCode-/)).toHaveLength(1);
    });

    it('builds a dashboard from the picked source and labels sample data', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.queryByTestId('analyticsHomeExploreSample')).not.toBeInTheDocument();

      fireEvent.change(screen.getByTestId('analyticsHomeExploreSourcePicker'), {
        target: { value: SAMPLE_EVENT_SOURCE.name },
      });

      expect(screen.getByTestId('analyticsHomeExploreSample')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('analyticsHomeBuildSourceDashboard'));
      expect(links.createSourceDashboard).toHaveBeenCalledWith(SAMPLE_EVENT_SOURCE, {
        selectedUseCaseId: undefined,
        generatedPanels: undefined,
      });
    });

    it('hides the source picker when there is one source', () => {
      setup({
        result: createClusterStateResult({
          ...HAS_DATA_STATE,
          sources: [EVENT_SOURCE],
          totalSources: 1,
        }),
      });

      expect(screen.queryByTestId('analyticsHomeExploreSourcePicker')).not.toBeInTheDocument();
    });

    it('says how many sources the picker leaves out', () => {
      const { showResult } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.queryByTestId('analyticsHomeExploreMore')).not.toBeInTheDocument();

      showResult(createClusterStateResult({ ...HAS_DATA_STATE, totalSources: 5 }));

      expect(screen.getByTestId('analyticsHomeExploreMore')).toHaveTextContent(
        'Showing your 2 largest sources. 3 more are available in Discover.'
      );
    });

    it('opens the sources flyout from "Add another source"', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      fireEvent.click(screen.getByTestId('analyticsHomeAddSource'));

      expect(screen.getByTestId('analyticsHomeSourcesFlyout')).toBeInTheDocument();
    });

    it('offers the agent once, and only when it is available', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      fireEvent.click(screen.getByTestId('analyticsHomeExploreAskAgent'));
      expect(links.askAgent).toHaveBeenCalledWith(expect.stringContaining(EVENT_SOURCE.name));
      expect(screen.getAllByRole('button', { name: /agent/i })).toHaveLength(1);
    });

    it('hides the agent action when the agent is unavailable', () => {
      setup({
        result: createClusterStateResult(HAS_DATA_STATE),
        links: createLinksMock({ canOpenAgentChat: false }),
      });

      expect(screen.queryByTestId('analyticsHomeExploreAskAgent')).not.toBeInTheDocument();
    });

    it('keeps gated actions reachable without the privileges', () => {
      const { links } = setup({
        result: createClusterStateResult(HAS_DATA_STATE),
        links: createLinksMock({ canUseDiscover: false, canCreateDashboard: false }),
      });

      const openInDiscover = screen.getByTestId(`analyticsHomeOpenInDiscover-${queries[0].id}`);
      expect(openInDiscover).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(openInDiscover);
      expect(links.openDiscover).not.toHaveBeenCalled();

      const buildDashboard = screen.getByTestId('analyticsHomeBuildSourceDashboard');
      expect(buildDashboard).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(buildDashboard);
      expect(links.createSourceDashboard).not.toHaveBeenCalled();
    });
  });

  describe('has dashboards', () => {
    it('offers three quick actions and no tutorial content', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DASHBOARDS_STATE) });

      expect(screen.getByTestId('analyticsHomeSummary')).toHaveTextContent(
        '1.3M events · 2 sources · 2 dashboards'
      );
      expect(
        within(screen.getByTestId('analyticsHomeQuickActions')).getAllByRole('button')
      ).toHaveLength(3);
      expect(screen.queryByTestId('analyticsHomeExplorePanel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsHomeConnectPanel')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('analyticsHomeExploreEvents'));
      expect(links.openDiscover).toHaveBeenCalledWith(
        getSourceStarterQueries(EVENT_SOURCE)[0].esql
      );
      fireEvent.click(screen.getByTestId('analyticsHomeNewDashboard'));
      expect(links.createDashboard).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByTestId('analyticsHomeAddSource'));
      expect(screen.getByTestId('analyticsHomeSourcesFlyout')).toBeInTheDocument();
    });

    it("explores the user's own source even when a sample source is larger", () => {
      const { links } = setup({
        result: createClusterStateResult({
          ...HAS_DASHBOARDS_STATE,
          sources: [SAMPLE_EVENT_SOURCE, OWN_SMALL_SOURCE],
        }),
      });

      fireEvent.click(screen.getByTestId('analyticsHomeExploreEvents'));
      expect(links.openDiscover).toHaveBeenCalledWith(
        getSourceStarterQueries(OWN_SMALL_SOURCE)[0].esql
      );
    });

    it('opens recent dashboards and event sources', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DASHBOARDS_STATE) });

      fireEvent.click(screen.getByRole('button', { name: 'Checkout funnel' }));
      expect(links.openDashboard).toHaveBeenCalledWith('checkout-funnel');

      fireEvent.click(screen.getByTestId('analyticsHomeViewAllDashboards'));
      expect(links.openDashboards).toHaveBeenCalledTimes(1);

      fireEvent.click(
        within(screen.getByTestId('analyticsHomeEventSources')).getByRole('button', {
          name: new RegExp(EVENT_SOURCE.name),
        })
      );
      expect(links.openDiscover).toHaveBeenCalledWith(
        getSourceStarterQueries(EVENT_SOURCE)[0].esql
      );
    });

    it('lists the sources without links when Discover is unavailable', () => {
      setup({
        result: createClusterStateResult(HAS_DASHBOARDS_STATE),
        links: createLinksMock({ canUseDiscover: false }),
      });

      const sources = screen.getByTestId('analyticsHomeEventSources');
      expect(within(sources).getByText(EVENT_SOURCE.name)).toBeInTheDocument();
      expect(within(sources).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByTestId('analyticsHomeExploreEvents')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
  });

  describe('journeys', () => {
    const OWN_SEARCH_LARGEST = {
      ...MIXED_STATE,
      sources: [{ ...SEARCH_SOURCE, documentsCount: 2_000_000 }, EVENT_SOURCE],
    };

    it('renders the classic search home for search data, and nothing of the analytics home', () => {
      const { links } = setup({ result: createClusterStateResult(SEARCH_STATE) });

      expectOnlyView('elasticsearchHomePage');
      expect(screen.queryByTestId('unifiedHomePage')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsHomeFooter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsHomeJourneySwitch')).not.toBeInTheDocument();
      expect(mockUseEventsOverTime).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('searchHomeGuidedSetupLink'));
      expect(links.openOnboarding).toHaveBeenCalledTimes(1);
    });

    it('renders the analytics home for event data, and not the search home', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expectOnlyView('analyticsHomeHasData');
      expect(screen.queryByTestId('searchHomeFooter')).not.toBeInTheDocument();
    });

    it('shows the search home when the analytics journey has no listed event source', () => {
      setup({
        result: createClusterStateResult({ ...SEARCH_STATE, journey: 'analytics' }),
      });

      expectOnlyView('elasticsearchHomePage');
    });

    it("defaults to the journey of the user's largest own source", () => {
      const { showResult } = setup({ result: createClusterStateResult(MIXED_STATE) });
      expectOnlyView('analyticsHomeHasData');

      showResult(createClusterStateResult(OWN_SEARCH_LARGEST));
      expectOnlyView('elasticsearchHomePage');

      showResult(
        createClusterStateResult({
          ...MIXED_STATE,
          sources: [{ ...SAMPLE_EVENT_SOURCE, documentsCount: 9_000_000 }, SEARCH_SOURCE],
        })
      );
      expectOnlyView('elasticsearchHomePage');
    });

    it('offers one switch to the other journey and remembers the choice', () => {
      const { showResult } = setup({ result: createClusterStateResult(MIXED_STATE) });

      expect(screen.getByTestId('analyticsHomeJourneySwitch')).toHaveTextContent(
        'Looking for search?'
      );
      expect(screen.getAllByTestId(/^analyticsHomeSwitchTo-/)).toHaveLength(1);

      fireEvent.click(screen.getByTestId('analyticsHomeSwitchTo-search'));

      expectOnlyView('elasticsearchHomePage');
      expect(storedJourney).toBe('search');
      expect(screen.getByTestId('analyticsHomeJourneySwitch')).toHaveTextContent(
        'Looking for event analytics?'
      );
      expect(mockAddSuccess).not.toHaveBeenCalled();

      // The choice outlives a change in which source is the largest.
      showResult(createClusterStateResult({ ...MIXED_STATE, documentsCount: 2_000_000 }));
      expectOnlyView('elasticsearchHomePage');

      fireEvent.click(screen.getByTestId('analyticsHomeSwitchTo-analytics'));

      expectOnlyView('analyticsHomeHasData');
      expect(storedJourney).toBe('analytics');
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    });

    it('opens on the journey picked earlier in this browser', () => {
      storedJourney = 'search';
      setup({ result: createClusterStateResult(MIXED_STATE) });

      expectOnlyView('elasticsearchHomePage');
    });

    it('ignores the picked journey when the data supports only the other one', () => {
      storedJourney = 'search';
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expectOnlyView('analyticsHomeHasData');
      expect(screen.queryByTestId('analyticsHomeJourneySwitch')).not.toBeInTheDocument();
    });

    it.each([
      ['hasData', MIXED_STATE],
      [
        'hasDashboards',
        { ...HAS_DASHBOARDS_STATE, ...OWN_SEARCH_LARGEST, stage: 'hasDashboards' as const },
      ],
    ])('leaves search sources out of everything the analytics home shows in %s', (_, state) => {
      storedJourney = 'analytics';
      setup({ result: createClusterStateResult(state) });

      const page = screen.getByTestId('unifiedHomePage');
      expect(page).not.toHaveTextContent(SEARCH_SOURCE.name);
      expect(screen.getByTestId('analyticsHomeSummary')).toHaveTextContent(
        '1.3M events · 1 source'
      );
      expect(screen.queryByTestId('analyticsHomeExploreSourcePicker')).not.toBeInTheDocument();
      expect(mockUseEventsOverTime).toHaveBeenLastCalledWith([
        { name: EVENT_SOURCE.name, timeField: EVENT_SOURCE.timeField },
      ]);
    });
  });

  describe('error', () => {
    it('offers a retry and still lets the user add data', () => {
      const { result } = setup({
        result: createClusterStateResult(undefined, { isError: true }),
      });

      expectOnlyView('analyticsHomeError');
      expect(screen.getByTestId('analyticsHomeErrorCallout')).toHaveTextContent(
        'Unable to check this deployment for data'
      );
      expect(screen.queryByTestId('analyticsHomeConnectPanel')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('analyticsHomeRetry'));
      expect(result.refetch).toHaveBeenCalledTimes(1);

      expect(screen.queryByTestId('analyticsHomeFooter')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('analyticsHomeAddSource'));
      expect(screen.getByTestId('analyticsHomeSourcesFlyout')).toBeInTheDocument();
    });

    it('shows the retry in progress', () => {
      setup({
        result: createClusterStateResult(undefined, { isError: true, isFetching: true }),
      });

      expectOnlyView('analyticsHomeError');
      expect(screen.getByTestId('analyticsHomeRetry')).toBeDisabled();
    });

    it('keeps showing the last state when a later check fails', () => {
      const { showResult } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      showResult(createClusterStateResult(HAS_DATA_STATE, { isError: true }));

      expectOnlyView('analyticsHomeHasData');
    });
  });

  describe('example queries by use case', () => {
    const useCases = getAnalyticsUseCases();
    const getUseCase = (id: AnalyticsUseCaseId) => {
      const useCase = useCases.find((candidate) => candidate.id === id);
      if (!useCase) {
        throw new Error(`Missing use case ${id}`);
      }
      return useCase;
    };

    it('reveals a use case only after it is chosen', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      fireEvent.click(screen.getByTestId('analyticsHomeUseCaseExamplesToggle'));

      const footer = within(screen.getByTestId('analyticsHomeFooter'));
      expect(footer.getAllByTestId(/^analyticsHomeUseCase-/)).toHaveLength(useCases.length);
      expect(footer.queryByTestId(/^analyticsHomeQueryCode-/)).not.toBeInTheDocument();
    });

    it('keeps illustrative queries copy-only', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });
      const gaming = getUseCase('gaming');

      fireEvent.click(screen.getByTestId('analyticsHomeUseCaseExamplesToggle'));
      fireEvent.click(screen.getByTestId('analyticsHomeUseCase-gaming'));

      expect(screen.getByTestId('analyticsHomeIllustrativeIndexNote')).toHaveTextContent(
        gaming.indexPattern
      );
      expect(
        screen.getByTestId(`analyticsHomeQueryCode-${gaming.starterQueries[0].id}`)
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('analyticsHomeFooter')).queryByTestId(
          /^analyticsHomeOpenInDiscover-/
        )
      ).not.toBeInTheDocument();
      expect(links.openDiscover).not.toHaveBeenCalled();
    });

    it('installs the sample events before opening a sample-backed query', async () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });
      const clickstream = getUseCase('clickstream');
      const [query] = clickstream.starterQueries;

      fireEvent.click(screen.getByTestId('analyticsHomeUseCaseExamplesToggle'));
      fireEvent.click(screen.getByTestId('analyticsHomeUseCase-clickstream'));

      expect(screen.queryByTestId('analyticsHomeIllustrativeIndexNote')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId(`analyticsHomeOpenInDiscover-${query.id}`));

      await waitFor(() => expect(links.openDiscover).toHaveBeenCalledWith(query.esql));
      expect(install).toHaveBeenCalledWith('clickstream');
    });

    it('does not open Discover when the sample events cannot be installed', async () => {
      install.mockResolvedValue(false);
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });
      const [query] = getUseCase('clickstream').starterQueries;

      fireEvent.click(screen.getByTestId('analyticsHomeUseCaseExamplesToggle'));
      fireEvent.click(screen.getByTestId('analyticsHomeUseCase-clickstream'));
      fireEvent.click(screen.getByTestId(`analyticsHomeOpenInDiscover-${query.id}`));

      await waitFor(() => expect(install).toHaveBeenCalledWith('clickstream'));
      await waitFor(() =>
        expect(screen.getByTestId(`analyticsHomeOpenInDiscover-${query.id}`)).toBeEnabled()
      );
      expect(links.openDiscover).not.toHaveBeenCalled();
    });
  });
});
