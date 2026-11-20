/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import { useAnalyticsLinks } from '../../hooks/use_analytics_links';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import { useSampleData } from '../../hooks/use_sample_data';
import { getSourceStarterQueries } from '../../source_queries';
import { getAnalyticsSourceGroups } from '../../sources';
import type {
  AnalyticsClusterStateResult,
  AnalyticsLinks,
  AnalyticsSampleData,
  ResolvedJourney,
} from '../../types';
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
import { GuidedSetupPage } from './guided_setup';
import { getBuildSearchAgentPrompt } from './search_setup_step';

// The steps are separate chunks in the app; here they render synchronously.
jest.mock('../lazy_views', () => ({
  LazyConnectStep: jest.requireActual('./connect_step').ConnectStep,
  LazyAnalyticsSetupStep: jest.requireActual('./analytics_setup_step').AnalyticsSetupStep,
  LazySearchSetupStep: jest.requireActual('./search_setup_step').SearchSetupStep,
}));
jest.mock('../../hooks/use_analytics_cluster_state');
jest.mock('../../hooks/use_chrome_hidden');
jest.mock('../shared/connection_details', () => ({
  ConnectionDetails: () => <div data-test-subj="connectionDetailsStub" />,
}));
jest.mock('../../hooks/use_analytics_links');
jest.mock('../../hooks/use_analytics_preferences');
jest.mock('../../hooks/use_sample_data');
jest.mock('../../hooks/use_source_generation');
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

const install: jest.MockedFunction<AnalyticsSampleData['install']> = jest.fn();

const STEP_IDS = ['connect', 'explore', 'dashboard', 'search', 'build'];

// Stands in for the per-browser storage behind the preferences hook.
let storedJourney: ResolvedJourney | undefined;

const Page = () => (
  <EuiThemeProvider>
    <GuidedSetupPage />
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

const expectOnlyStep = (stepId: string, position: number): void => {
  for (const candidate of STEP_IDS) {
    const step = screen.queryByTestId(`analyticsOnboardingStep-${candidate}`);
    if (candidate === stepId) {
      expect(step).toBeInTheDocument();
    } else {
      expect(step).not.toBeInTheDocument();
    }
  }
  expect(screen.getByTestId('analyticsOnboardingStepCount')).toHaveTextContent(
    `Step ${position} of 3`
  );
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
};

describe('GuidedSetupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    install.mockResolvedValue(true);
    mockUseSampleData.mockReturnValue({ isInstalling: false, install });
    storedJourney = undefined;
    localStorage.clear();
    mockUseAnalyticsPreferences.mockImplementation(() => {
      const [preferredJourney, setJourney] = useState(storedJourney);
      return {
        selectedUseCaseId: undefined,
        selectUseCase: jest.fn(),
        preferredJourney,
        setPreferredJourney: (journey: ResolvedJourney): void => {
          storedJourney = journey;
          setJourney(journey);
        },
      };
    });
  });

  it('keeps the cluster state fresh by polling', () => {
    setup();

    expect(mockUseAnalyticsClusterState).toHaveBeenCalledWith({ poll: true });
  });

  describe('initial step', () => {
    it('shows no step until the cluster state has loaded', () => {
      const { showResult } = setup({
        result: createClusterStateResult(undefined, { isLoading: true }),
      });

      expect(screen.getByTestId('analyticsOnboardingLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('analyticsOnboardingStepCount')).not.toBeInTheDocument();

      showResult(createClusterStateResult(HAS_DATA_STATE));

      expectOnlyStep('explore', 2);
    });

    it.each([
      ['connect', 1, NO_DATA_STATE],
      ['explore', 2, HAS_DATA_STATE],
      ['dashboard', 3, HAS_DASHBOARDS_STATE],
    ])('starts on the %s step', (stepId, position, state) => {
      setup({ result: createClusterStateResult(state) });

      expectOnlyStep(stepId, position);
    });

    it('starts on the first search step for search data', () => {
      setup({ result: createClusterStateResult(SEARCH_STATE) });

      expectOnlyStep('search', 2);
      expect(screen.getByTestId('analyticsOnboardingTitle')).toHaveTextContent(
        'Get started with search'
      );
    });

    it('shows a retry and no step when the cluster cannot be inspected', () => {
      const { result } = setup({
        result: createClusterStateResult(undefined, { isError: true }),
      });

      expect(screen.getByTestId('analyticsOnboardingErrorView')).toBeInTheDocument();
      for (const stepId of STEP_IDS) {
        expect(screen.queryByTestId(`analyticsOnboardingStep-${stepId}`)).not.toBeInTheDocument();
      }
      expect(screen.queryByTestId('analyticsOnboardingStepCount')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsOnboardingNext')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsOnboardingFinish')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('analyticsOnboardingRetry'));
      expect(result.refetch).toHaveBeenCalledTimes(1);
    });

    it('keeps the step when a later check fails', () => {
      const { showResult } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      showResult(createClusterStateResult(HAS_DATA_STATE, { isError: true }));

      expectOnlyStep('explore', 2);
    });
  });

  describe('navigation', () => {
    const NAVIGATION_CONTROLS = [
      'analyticsOnboardingExploreDetected',
      'analyticsOnboardingNext',
      'analyticsOnboardingFinish',
    ];

    const expectOnlyNavigation = (controlTestSubj: string): void => {
      for (const testSubj of NAVIGATION_CONTROLS) {
        if (testSubj === controlTestSubj) {
          expect(screen.getByTestId(testSubj)).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId(testSubj)).not.toBeInTheDocument();
        }
      }
    };

    it('offers one way onward per step and focuses the step heading', () => {
      const { links, showResult } = setup();

      expectOnlyNavigation('none');

      showResult(createClusterStateResult(HAS_DATA_STATE));
      expectOnlyNavigation('analyticsOnboardingExploreDetected');

      fireEvent.click(screen.getByTestId('analyticsOnboardingExploreDetected'));
      expectOnlyStep('explore', 2);
      expectOnlyNavigation('analyticsOnboardingNext');
      expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();

      fireEvent.click(screen.getByTestId('analyticsOnboardingNext'));
      expectOnlyStep('dashboard', 3);
      expectOnlyNavigation('analyticsOnboardingFinish');

      fireEvent.click(screen.getByTestId('analyticsOnboardingFinish'));
      expect(links.openHome).toHaveBeenCalledTimes(1);
    });

    it('steps back through the setup from a deployment that already has dashboards', () => {
      setup({ result: createClusterStateResult(HAS_DASHBOARDS_STATE) });

      expectOnlyStep('dashboard', 3);
      fireEvent.click(screen.getByTestId('analyticsOnboardingBack'));
      expectOnlyStep('explore', 2);
      expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();

      fireEvent.click(screen.getByTestId('analyticsOnboardingBack'));
      expectOnlyStep('connect', 1);
      expect(screen.queryByTestId('analyticsOnboardingBack')).not.toBeInTheDocument();
    });

    it('returns to the connect step when the events are gone', () => {
      const { showResult } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      fireEvent.click(screen.getByTestId('analyticsOnboardingNext'));
      expectOnlyStep('dashboard', 3);

      showResult(createClusterStateResult(NO_DATA_STATE));
      expectOnlyStep('connect', 1);
      expect(screen.getByTestId('analyticsOnboardingConnectPanel')).toBeInTheDocument();
    });

    it('does not take focus on the initial step', () => {
      setup();

      expect(screen.getByRole('heading', { level: 2 })).not.toHaveFocus();
    });
  });

  describe('ingest gate', () => {
    it('is all the first step shows, with no skip, next or back', () => {
      const { links } = setup();

      expectOnlyStep('connect', 1);
      expect(screen.getByTestId('analyticsOnboardingIngestGate')).toBeInTheDocument();
      expect(screen.getByTestId('analyticsOnboardingTitle')).toHaveTextContent(
        'Get started with Elasticsearch'
      );
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add your data');
      expect(screen.getAllByRole('button').map((button) => button.dataset.testSubj)).toEqual([
        'analyticsOnboardingFeaturedSource-fileUpload',
        'analyticsOnboardingFeaturedSource-eventsIndex',
        'analyticsOnboardingFeaturedSource-eventStream',
        'analyticsOnboardingFeaturedSource-webCrawl',
        'analyticsOnboardingMoreSources',
        'analyticsOnboardingTrySampleEvents',
      ]);
      expect(screen.getByTestId('analyticsOnboardingStep-connect')).not.toHaveTextContent(
        /analytics|dashboard/i
      );
      expect(links.openHome).not.toHaveBeenCalled();
    });

    it('addresses events when event analytics was asked for in this browser', () => {
      storedJourney = 'analytics';
      setup();

      expectOnlyStep('connect', 1);
      expect(screen.getByTestId('analyticsOnboardingTitle')).toHaveTextContent(
        'Get started with event analytics'
      );
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add your events');
      expect(screen.getByTestId('analyticsOnboardingStep-connect')).toHaveTextContent(
        'Analyze clickstreams, product telemetry, game events and payments with ES|QL and dashboards.'
      );
      expect(screen.getAllByRole('button').map((button) => button.dataset.testSubj)).toEqual([
        'analyticsOnboardingFeaturedSource-eventsIndex',
        'analyticsOnboardingFeaturedSource-eventStream',
        'analyticsOnboardingFeaturedSource-fileUpload',
        'analyticsOnboardingFeaturedSource-sampleEvents',
        'analyticsOnboardingMoreSources',
      ]);
    });

    it('names event analytics while loading only in a browser that has not seen data here', () => {
      storedJourney = 'analytics';
      setup({ result: createClusterStateResult(undefined, { isLoading: true }) });

      expect(screen.getByTestId('analyticsOnboardingTitle')).toHaveTextContent(
        'Get started with event analytics'
      );
      cleanup();

      localStorage.setItem('searchHomepage.hasData', 'true');
      setup({ result: createClusterStateResult(undefined, { isLoading: true }) });

      expect(screen.getByTestId('analyticsOnboardingTitle')).toHaveTextContent(
        'Get started with Elasticsearch'
      );
    });

    it('follows search data that arrives, whatever was asked for', () => {
      storedJourney = 'analytics';
      const { showResult } = setup();

      showResult(createClusterStateResult(SEARCH_STATE));

      expect(screen.getByTestId('analyticsOnboardingTitle')).toHaveTextContent(
        'Get started with search'
      );
      expect(screen.queryByText('Add your events')).not.toBeInTheDocument();
    });

    it.each([
      ['analytics', HAS_DASHBOARDS_STATE, 'dashboard'],
      ['search', SEARCH_STATE, 'search'],
    ])('closes the later %s steps again when the data is gone', (_, state, stepId) => {
      const { showResult } = setup({ result: createClusterStateResult(state) });
      expect(screen.getByTestId(`analyticsOnboardingStep-${stepId}`)).toBeInTheDocument();

      showResult(createClusterStateResult(NO_DATA_STATE));

      expectOnlyStep('connect', 1);
      expect(screen.getByTestId('analyticsOnboardingIngestGate')).toBeInTheDocument();
      expect(screen.queryByTestId('analyticsOnboardingBack')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsOnboardingNext')).not.toBeInTheDocument();
    });

    it('offers the search step when search data is detected', () => {
      const { showResult } = setup();

      showResult(createClusterStateResult(SEARCH_STATE));

      expectOnlyStep('connect', 1);
      expect(screen.queryByTestId('analyticsOnboardingIngestGate')).not.toBeInTheDocument();
      expect(screen.getByTestId('analyticsOnboardingEventsDetected')).toHaveTextContent(
        `Data detected in ${SEARCH_SOURCE.name}`
      );
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'This deployment has data'
      );

      fireEvent.click(screen.getByTestId('analyticsOnboardingExploreDetected'));

      expectOnlyStep('search', 2);
      expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    });
  });

  describe('search journey', () => {
    it('runs a search on the search source, then builds on it with the agent', () => {
      const { links } = setup({ result: createClusterStateResult(SEARCH_STATE) });

      expectOnlyStep('search', 2);
      expect(screen.getByTestId('analyticsOnboardingSearchSource')).toHaveTextContent(
        `${SEARCH_SOURCE.name} · 48K documents`
      );
      const step = within(screen.getByTestId('analyticsOnboardingSearchPanel-search'));
      expect(step.getAllByRole('button')).toHaveLength(2);

      fireEvent.click(screen.getByTestId('analyticsOnboardingRunSearch'));
      expect(links.openSearchRequest).toHaveBeenCalledWith(SEARCH_SOURCE);
      fireEvent.click(screen.getByTestId('analyticsOnboardingConnectionDetails'));
      expect(links.openConnectionDetails).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('analyticsOnboardingNext'));

      expectOnlyStep('build', 3);
      fireEvent.click(screen.getByTestId('analyticsOnboardingChatWithData'));
      expect(links.askAgent).toHaveBeenCalledWith(getBuildSearchAgentPrompt(SEARCH_SOURCE));
      fireEvent.click(screen.getByTestId('analyticsOnboardingOpenIndex'));
      expect(links.openIndexDetails).toHaveBeenCalledWith(SEARCH_SOURCE);

      fireEvent.click(screen.getByTestId('analyticsOnboardingFinish'));
      expect(links.openHome).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('analyticsOnboardingBack'));
      expectOnlyStep('search', 2);
      fireEvent.click(screen.getByTestId('analyticsOnboardingBack'));
      expectOnlyStep('connect', 1);
    });

    it('builds from the index when the agent is unavailable, and says so when neither is', () => {
      const { showResult } = setup({
        result: createClusterStateResult(SEARCH_STATE),
        links: createLinksMock({ canOpenAgentChat: false }),
      });
      fireEvent.click(screen.getByTestId('analyticsOnboardingNext'));

      expect(screen.queryByTestId('analyticsOnboardingChatWithData')).not.toBeInTheDocument();
      expect(screen.getByTestId('analyticsOnboardingOpenIndex')).toHaveTextContent(
        `Open ${SEARCH_SOURCE.name} in Index Management`
      );

      mockUseAnalyticsLinks.mockReturnValue(
        createLinksMock({ canOpenAgentChat: false, canOpenIndices: false })
      );
      showResult(createClusterStateResult(SEARCH_STATE));

      expect(screen.queryByTestId('analyticsOnboardingOpenIndex')).not.toBeInTheDocument();
      expect(screen.getByTestId('analyticsOnboardingBuildUnavailable')).toBeInTheDocument();
    });

    it('shows nothing of the analytics steps', () => {
      setup({ result: createClusterStateResult(SEARCH_STATE) });

      expect(screen.queryByTestId('analyticsOnboardingExplorePanel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analyticsOnboardingJourneySwitch')).not.toBeInTheDocument();
    });
  });

  describe('mixed data', () => {
    it('follows the largest own source, with one switch that is remembered', () => {
      setup({ result: createClusterStateResult(MIXED_STATE) });

      expectOnlyStep('explore', 2);
      expect(screen.getByTestId('analyticsOnboardingStep-explore')).not.toHaveTextContent(
        SEARCH_SOURCE.name
      );
      expect(
        screen.queryByTestId('analyticsOnboardingExploreSourcePicker')
      ).not.toBeInTheDocument();
      expect(screen.getAllByTestId(/^analyticsOnboardingSwitchTo-/)).toHaveLength(1);

      fireEvent.click(screen.getByTestId('analyticsOnboardingSwitchTo-search'));

      expectOnlyStep('search', 2);
      expect(storedJourney).toBe('search');
      expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();

      fireEvent.click(screen.getByTestId('analyticsOnboardingSwitchTo-analytics'));

      expectOnlyStep('explore', 2);
      expect(storedJourney).toBe('analytics');
    });

    it('opens on the journey picked earlier in this browser', () => {
      storedJourney = 'search';
      setup({ result: createClusterStateResult(MIXED_STATE) });

      expectOnlyStep('search', 2);
    });

    it('shows no switch for one kind of data', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.queryByTestId('analyticsOnboardingJourneySwitch')).not.toBeInTheDocument();
    });
  });

  describe('connect step', () => {
    it('shares the connect panel with the home page', () => {
      const { links } = setup();

      expect(screen.getAllByTestId(/^analyticsOnboardingFeaturedSource-/)).toHaveLength(4);

      const fileUpload = screen.getByTestId('analyticsOnboardingFeaturedSource-fileUpload');
      fireEvent.click(fileUpload);
      expect(links.openSource).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fileUpload' }),
        fileUpload
      );

      fireEvent.click(screen.getByTestId('analyticsOnboardingMoreSources'));
      for (const { id } of getAnalyticsSourceGroups()) {
        expect(screen.getByTestId(`analyticsOnboardingSourceGroup-${id}`)).toBeInTheDocument();
      }
      expect(
        screen.queryByTestId('analyticsOnboardingFlyoutSource-connectors')
      ).not.toBeInTheDocument();
    });

    it('lists the event sources from the event stream tile', () => {
      const { links } = setup();
      const tile = screen.getByTestId('analyticsOnboardingFeaturedSource-eventStream');

      expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
      fireEvent.click(tile);

      expect(
        within(screen.getByTestId('analyticsOnboardingSourcesFlyout'))
          .getAllByTestId(/^analyticsOnboardingSourceGroup-/)
          .map((group) => group.dataset.testSubj)
      ).toEqual([
        'analyticsOnboardingSourceGroup-streaming',
        'analyticsOnboardingSourceGroup-sendEvents',
        'analyticsOnboardingSourceGroup-objectStorage',
      ]);

      fireEvent.click(screen.getByTestId('analyticsOnboardingFlyoutSource-kafka'));
      expect(links.openSource).toHaveBeenCalledWith(expect.objectContaining({ id: 'kafka' }), tile);
      expect(screen.queryByTestId('analyticsOnboardingSourcesFlyout')).not.toBeInTheDocument();
    });

    it('opens the website crawl from its tile, handing over the tile for the focus to return to', () => {
      const { links } = setup();
      const tile = screen.getByTestId('analyticsOnboardingFeaturedSource-webCrawl');

      expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
      fireEvent.click(tile);

      expect(links.openSource).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'webCrawl', target: { type: 'webCrawl' } }),
        tile
      );
    });

    it('announces a dialog on the file upload tile where the upload opens on the page', () => {
      setup({ links: createLinksMock({ sourceOpensDialog: jest.fn(() => true) }) });

      expect(screen.getByTestId('analyticsOnboardingFeaturedSource-fileUpload')).toHaveAttribute(
        'aria-haspopup',
        'dialog'
      );
    });

    it('leaves the website crawl out where it is unavailable', () => {
      setup({
        links: createLinksMock({
          isSourceAvailable: jest.fn(({ target }) => target.type !== 'webCrawl'),
        }),
      });

      expect(
        screen
          .getAllByTestId(/^analyticsOnboardingFeaturedSource-/)
          .map((featured) => featured.dataset.testSubj)
      ).toEqual([
        'analyticsOnboardingFeaturedSource-fileUpload',
        'analyticsOnboardingFeaturedSource-eventsIndex',
        'analyticsOnboardingFeaturedSource-eventStream',
      ]);
    });

    it('offers the next step when events are detected', () => {
      const { showResult } = setup();

      const status = screen.getByTestId('analyticsOnboardingEventStatus');
      expect(status).toHaveAttribute('aria-live', 'polite');

      showResult(createClusterStateResult(HAS_DATA_STATE));

      expectOnlyStep('connect', 1);
      expect(screen.getByTestId('analyticsOnboardingEventStatus')).toBe(status);
      expect(screen.getByTestId('analyticsOnboardingEventsDetected')).toHaveTextContent(
        `Events detected in ${EVENT_SOURCE.name}`
      );
      expect(screen.queryByTestId('analyticsOnboardingConnectPanel')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'This deployment has events'
      );

      fireEvent.click(screen.getByTestId('analyticsOnboardingAddSource'));
      expect(screen.getByTestId('analyticsOnboardingSourcesFlyout')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('analyticsOnboardingSourcesFlyoutClose'));

      fireEvent.click(screen.getByTestId('analyticsOnboardingExploreDetected'));

      expectOnlyStep('explore', 2);
      expect(screen.getByTestId('analyticsOnboardingExploreTitle')).toHaveTextContent(
        `Explore ${EVENT_SOURCE.name}`
      );
    });

    it('says the detected events are samples when every source is sample data', () => {
      const { showResult } = setup();

      showResult(
        createClusterStateResult({
          ...HAS_DATA_STATE,
          sources: [SAMPLE_EVENT_SOURCE],
          totalSources: 1,
        })
      );

      expectOnlyStep('connect', 1);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'This deployment has sample events'
      );
    });

    it('advances by itself once the sample events it installed are detected', async () => {
      const { result, showResult } = setup();

      fireEvent.click(screen.getByTestId('analyticsOnboardingTrySampleEvents'));

      await waitFor(() => expect(result.refetch).toHaveBeenCalledTimes(1));
      expect(install).toHaveBeenCalledWith('clickstream');
      expectOnlyStep('connect', 1);

      showResult(
        createClusterStateResult({
          ...HAS_DATA_STATE,
          sources: [SAMPLE_EVENT_SOURCE],
          totalSources: 1,
        })
      );

      expectOnlyStep('explore', 2);
      expect(screen.getByTestId('analyticsOnboardingExploreSample')).toBeInTheDocument();
    });

    it('stays on the connect step when the sample events cannot be installed', async () => {
      install.mockResolvedValue(false);
      const { result } = setup();

      fireEvent.click(screen.getByTestId('analyticsOnboardingTrySampleEvents'));

      await waitFor(() => expect(install).toHaveBeenCalledWith('clickstream'));
      expect(result.refetch).not.toHaveBeenCalled();
      expectOnlyStep('connect', 1);
    });
  });

  describe('explore step', () => {
    it('opens a starter query for the largest source in Discover', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });
      const [query] = getSourceStarterQueries(EVENT_SOURCE);

      fireEvent.click(screen.getByTestId(`analyticsOnboardingOpenInDiscover-${query.id}`));

      expect(links.openDiscover).toHaveBeenCalledWith(query.esql);
    });

    it('leaves the agent out, so the step has one thing to do', () => {
      setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      expect(screen.queryByTestId('analyticsOnboardingExploreAskAgent')).not.toBeInTheDocument();
    });
  });

  describe('dashboard step', () => {
    it('builds a dashboard from the source, or starts blank, then goes home', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DASHBOARDS_STATE) });

      fireEvent.click(screen.getByTestId('analyticsOnboardingBuildSourceDashboard'));
      expect(links.createSourceDashboard).toHaveBeenCalledWith(EVENT_SOURCE, {
        selectedUseCaseId: undefined,
        generatedPanels: undefined,
      });

      fireEvent.click(screen.getByTestId('analyticsOnboardingCreateBlankDashboard'));
      expect(links.createDashboard).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('analyticsOnboardingFinish'));
      expect(links.openHome).toHaveBeenCalledTimes(1);
    });

    it('uses the source picked in the explore step', () => {
      const { links } = setup({ result: createClusterStateResult(HAS_DATA_STATE) });

      fireEvent.change(screen.getByTestId('analyticsOnboardingExploreSourcePicker'), {
        target: { value: SAMPLE_EVENT_SOURCE.name },
      });
      fireEvent.click(screen.getByTestId('analyticsOnboardingNext'));
      fireEvent.click(screen.getByTestId('analyticsOnboardingBuildSourceDashboard'));

      expect(links.createSourceDashboard).toHaveBeenCalledWith(SAMPLE_EVENT_SOURCE, {
        selectedUseCaseId: undefined,
        generatedPanels: undefined,
      });
    });

    it('keeps the dashboard actions reachable when they cannot be used', () => {
      const { links } = setup({
        result: createClusterStateResult(HAS_DATA_STATE),
        links: createLinksMock({ canCreateDashboard: false }),
      });

      fireEvent.click(screen.getByTestId('analyticsOnboardingNext'));

      const build = screen.getByTestId('analyticsOnboardingBuildSourceDashboard');
      const blank = screen.getByTestId('analyticsOnboardingCreateBlankDashboard');
      expect(build).toHaveAttribute('aria-disabled', 'true');
      expect(blank).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(build);
      fireEvent.click(blank);
      expect(links.createSourceDashboard).not.toHaveBeenCalled();
      expect(links.createDashboard).not.toHaveBeenCalled();
    });
  });
});
