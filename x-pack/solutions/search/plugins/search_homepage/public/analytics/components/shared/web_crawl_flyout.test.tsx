/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import type { WebCrawlPanelProps } from '@kbn/web-crawler-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import { useAnalyticsLinks } from '../../hooks/use_analytics_links';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import { useSampleData } from '../../hooks/use_sample_data';
import type { AnalyticsClusterStateResult } from '../../types';
import { UnifiedHomePage } from '../home/unified_home';
import {
  NO_DATA_STATE,
  SEARCH_STATE,
  createClusterStateResult,
  createLinksMock,
} from './test_helpers';
import { WebCrawlFlyoutProvider } from './web_crawl_flyout';
import type { WebCrawlFlyoutApi } from './web_crawl_flyout_context';
import { useWebCrawlFlyout } from './web_crawl_flyout_context';

jest.mock('../../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../lazy_views', () => ({
  LazyNoDataView: jest.requireActual('../home/no_data_view').NoDataView,
  LazyAnalyticsHome: jest.requireActual('../home/analytics_home').AnalyticsHome,
  LazySearchHome: jest.requireActual('../home/search_home').SearchHome,
}));
jest.mock('../../../components/search_homepage/search_homepage', () => ({
  SearchHomepagePage: () => <div data-test-subj="elasticsearchHomePage" />,
}));
jest.mock('../../hooks/use_analytics_cluster_state');
jest.mock('../../hooks/use_analytics_links');
jest.mock('../../hooks/use_analytics_preferences');
jest.mock('../../hooks/use_sample_data');
jest.mock('../../hooks/use_events_over_time');
jest.mock('../../hooks/use_source_generation');
jest.mock('../analytics_page_template', () => ({
  AnalyticsPageTemplate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseAnalyticsClusterState = jest.mocked(useAnalyticsClusterState);
const addSuccess = jest.fn();

const WebCrawlPanel = jest.fn((props: WebCrawlPanelProps) => (
  <div data-test-subj="webCrawlPanelStub">
    <input data-test-subj="webCrawlUrlStub" aria-label="URL" />
    <button data-test-subj="webCrawlManageStub" onClick={props.onManageWebCrawls}>
      Manage
    </button>
  </div>
));

const setServices = (history: MemoryHistory, hasWebCrawler: boolean): void => {
  mockUseKibana.mockReturnValue({
    services: {
      history,
      notifications: { toasts: { addSuccess } },
      webCrawler: hasWebCrawler ? { WebCrawlPanel, WebCrawlsPage: () => null } : undefined,
    },
  });
};

const FLYOUT = 'analyticsWebCrawlFlyout';

describe('WebCrawlFlyoutProvider', () => {
  let flyout: WebCrawlFlyoutApi;

  /** A page whose opener can be taken away, as when the arrival of data replaces the gate. */
  const Harness = () => {
    flyout = useWebCrawlFlyout();
    const [hasOpener, setHasOpener] = useState(true);

    return (
      <>
        {hasOpener && (
          <button
            data-test-subj="opener"
            onClick={({ currentTarget }) => flyout.open(currentTarget)}
          >
            Crawl a website
          </button>
        )}
        <button data-test-subj="replacePage" onClick={() => setHasOpener(false)}>
          Replace the page
        </button>
      </>
    );
  };

  const setup = ({ hasWebCrawler = true }: { hasWebCrawler?: boolean } = {}) => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    setServices(history, hasWebCrawler);
    render(
      <EuiThemeProvider>
        <Router history={history}>
          <WebCrawlFlyoutProvider>
            <Harness />
          </WebCrawlFlyoutProvider>
        </Router>
      </EuiThemeProvider>
    );

    return { history, opener: screen.getByTestId('opener') };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is unavailable outside a provider, and opening does nothing', () => {
    render(<Harness />);

    expect(flyout.isAvailable).toBe(false);
    fireEvent.click(screen.getByTestId('opener'));
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });

  it('is unavailable and opens nothing without the web crawler plugin', () => {
    const { opener } = setup({ hasWebCrawler: false });

    expect(flyout.isAvailable).toBe(false);
    fireEvent.click(opener);
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });

  it('stays closed until asked for', () => {
    setup();

    expect(flyout.isAvailable).toBe(true);
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
    expect(WebCrawlPanel).not.toHaveBeenCalled();
  });

  it('opens a dialog with the crawl form reduced to the URL, on the storage the search home reads', () => {
    const { opener } = setup();

    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBe(screen.getByTestId(FLYOUT));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Crawl a website');
    expect(dialog).toContainElement(screen.getByTestId('webCrawlPanelStub'));
    expect(WebCrawlPanel.mock.calls[0][0]).toEqual({
      telemetryPrefix: 'searchHomepageAnalytics',
      storageKeyPrefix: 'searchHomepage',
      optionsDisplay: 'collapsed',
      onManageWebCrawls: expect.any(Function),
    });
    expect(dialog).toHaveTextContent('can take several minutes');
    expect(dialog).toHaveTextContent('When the first page is indexed, this page changes');
  });

  it('returns the focus to the opener when closed with the button', () => {
    const { opener } = setup();

    opener.focus();
    fireEvent.click(opener);
    screen.getByTestId('webCrawlUrlStub').focus();
    expect(opener).not.toHaveFocus();

    fireEvent.click(screen.getByTestId('analyticsWebCrawlFlyoutClose'));

    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("returns the focus to the opener when closed with the flyout's own close control", () => {
    const { opener } = setup();

    fireEvent.click(opener);
    screen.getByTestId('webCrawlUrlStub').focus();
    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('stays open when the page that opened it is replaced, and closes without an opener to return to', () => {
    const { opener } = setup();

    fireEvent.click(opener);
    fireEvent.click(screen.getByTestId('replacePage'));

    expect(opener).not.toBeInTheDocument();
    expect(screen.getByTestId(FLYOUT)).toBeInTheDocument();
    expect(screen.getByTestId('webCrawlPanelStub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('analyticsWebCrawlFlyoutClose'));

    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
    expect(opener).not.toHaveFocus();
  });

  it('opens the page that manages crawls, and closes with the route change', () => {
    const { history, opener } = setup();

    fireEvent.click(opener);
    fireEvent.click(screen.getByTestId('webCrawlManageStub'));

    expect(history.location.pathname).toBe('/web_crawls');
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });

  it('closes when the route changes underneath it', () => {
    const { history, opener } = setup();

    fireEvent.click(opener);
    act(() => history.push('/get_started'));

    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });
});

describe('crawling a website from the ingest gate', () => {
  let flyout: WebCrawlFlyoutApi;
  const FlyoutBridge = () => {
    flyout = useWebCrawlFlyout();
    return null;
  };

  const Page = () => (
    <EuiThemeProvider>
      <Router history={createMemoryHistory({ initialEntries: ['/'] })}>
        <WebCrawlFlyoutProvider>
          <FlyoutBridge />
          <UnifiedHomePage />
        </WebCrawlFlyoutProvider>
      </Router>
    </EuiThemeProvider>
  );

  const setup = () => {
    setServices(createMemoryHistory(), true);
    // Stands in for the links hook, which opens the flyout for the website crawl.
    jest.mocked(useAnalyticsLinks).mockReturnValue(
      createLinksMock({
        openSource: jest.fn((source, opener) => {
          if (source.target.type === 'webCrawl') {
            flyout.open(opener);
          }
        }),
      })
    );
    jest.mocked(useSampleData).mockReturnValue({ isInstalling: false, install: jest.fn() });
    jest.mocked(useAnalyticsPreferences).mockReturnValue({
      selectedUseCaseId: undefined,
      selectUseCase: jest.fn(),
      preferredJourney: undefined,
      setPreferredJourney: jest.fn(),
    });
    mockUseAnalyticsClusterState.mockReturnValue(createClusterStateResult(NO_DATA_STATE));
    const { rerender } = render(<Page />);

    return {
      showResult: (result: AnalyticsClusterStateResult) => {
        mockUseAnalyticsClusterState.mockReturnValue(result);
        rerender(<Page />);
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens from the tile and returns the focus to it', () => {
    setup();
    const tile = screen.getByTestId('analyticsHomeFeaturedSource-webCrawl');

    fireEvent.click(tile);
    expect(screen.getByTestId(FLYOUT)).toBeInTheDocument();
    expect(screen.getByTestId('analyticsHomeIngestGate')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('analyticsWebCrawlFlyoutClose'));
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
    expect(tile).toHaveFocus();
  });

  it('keeps the flyout and its form mounted while the first crawled page turns the gate into the search home', () => {
    const { showResult } = setup();

    fireEvent.click(screen.getByTestId('analyticsHomeFeaturedSource-webCrawl'));
    const panel = screen.getByTestId('webCrawlPanelStub');
    const url = screen.getByTestId('webCrawlUrlStub');
    url.focus();

    showResult(createClusterStateResult(SEARCH_STATE));

    expect(screen.queryByTestId('analyticsHomeIngestGate')).not.toBeInTheDocument();
    expect(screen.getByTestId('elasticsearchHomePage')).toBeInTheDocument();
    expect(addSuccess).toHaveBeenCalledTimes(1);
    // The same elements, so what the form shows of the running crawl is not reset.
    expect(screen.getByTestId('webCrawlPanelStub')).toBe(panel);
    expect(url).toHaveFocus();

    fireEvent.click(screen.getByTestId('analyticsWebCrawlFlyoutClose'));

    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
    expect(screen.getByTestId('elasticsearchHomePage')).toBeInTheDocument();
  });
});
