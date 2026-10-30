/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useDetectionEntities } from '../../data/detection_entities/use_detection_entities';
import { useMaintenanceStatus } from '../../data/maintenance/use_significant_events_maintenance';
import { useFetchSources } from '../../data/sources/use_fetch_sources';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import type { DetectionTabId } from './detection_tabs';
import { DetectionPage } from './page';

jest.mock('../../components/app_header', () => ({
  NightshiftAppHeader: () => <div data-test-subj="nightshiftAppHeaderStub" />,
}));
jest.mock('../../data/detection_overview/use_detection_overview');
jest.mock('../../data/detection_entities/use_detection_entities');
jest.mock('../../data/maintenance/use_significant_events_maintenance');
jest.mock('../../data/sources/use_fetch_sources');
jest.mock('../../hooks/use_developer_mode');
jest.mock('./events/events_tab', () => ({
  EventsTab: () => <div data-test-subj="eventsTabStub" />,
}));
jest.mock('./rules/rules_tab', () => ({
  RulesTab: () => <div data-test-subj="rulesTabStub" />,
}));
jest.mock('./signals/signals_tab', () => ({
  SignalsTab: () => <div data-test-subj="signalsTabStub" />,
}));
jest.mock('./run_limits_banner', () => ({ RunLimitsBanner: () => null }));
jest.mock('../../sources/recommended_sources/recommended_sources_table', () => ({
  RecommendedSourcesTable: () => <div data-test-subj="recommendedSourcesTableStub" />,
}));
let mockCanManage = true;
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: { nightshift: { show: true, manage: mockCanManage } },
        getUrlForApp: () => '/app/nightshift/',
      },
    },
  }),
}));

const mockUseDetectionOverview = useDetectionOverview as jest.Mock;
const mockUseDetectionEntities = useDetectionEntities as jest.Mock;
const mockUseMaintenanceStatus = useMaintenanceStatus as jest.Mock;
const mockUseFetchSources = useFetchSources as jest.Mock;
const mockUseDeveloperMode = useDeveloperMode as jest.Mock;
const refetch = jest.fn();
let mockSourcesCount = 1;
let mockHistoryDetections = 0;
let mockHistorySignificantEvents = 0;

const renderPage = (initialPath = '/detections/events', tab: DetectionTabId = 'events') => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={history}>
          <DetectionPage headerProps={{}} tab={tab} />
        </Router>
      </EuiProvider>
    </I18nProvider>
  );
  return history;
};

describe('DetectionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanManage = true;
    mockSourcesCount = 1;
    mockHistoryDetections = 0;
    mockHistorySignificantEvents = 0;
    mockUseDeveloperMode.mockReturnValue({ isDeveloperMode: false });
    mockUseFetchSources.mockImplementation(() => ({
      data: mockSourcesCount,
      isLoading: false,
      isError: false,
    }));
    mockUseDetectionEntities.mockReturnValue({
      data: { entities: [], unassigned: { rules: 0, active_events: 0 }, truncated: false },
      isLoading: false,
      isError: false,
      refetch,
    });
    mockUseMaintenanceStatus.mockReturnValue({
      data: { state: 'paused' },
      isLoading: false,
      isError: false,
    });
    mockUseDetectionOverview.mockImplementation(({ from }: { from: string }) => ({
      data:
        from === 'now-10y'
          ? {
              entities: 0,
              knowledge_indicators: 0,
              active_rules: 0,
              detections: mockHistoryDetections,
              significant_events: mockHistorySignificantEvents,
            }
          : {
              entities: 6,
              knowledge_indicators: 113,
              active_rules: 80,
              detections: 40,
              significant_events: 23,
            },
      isLoading: false,
      isError: false,
      refetch,
    }));
  });

  it('shows onboarding when the space has no sources or history', () => {
    mockSourcesCount = 0;
    renderPage();

    expect(screen.getByTestId('nightshiftDetectionOnboarding')).toBeInTheDocument();
    expect(screen.getByTestId('recommendedSourcesTableStub')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDetectionTab-events')).not.toBeInTheDocument();
  });

  it('shows earlier results and a warning when the space has no sources', async () => {
    mockSourcesCount = 0;
    mockHistoryDetections = 1;
    renderPage();

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionNoSourcesCallout')).toBeInTheDocument();
  });

  it('shows the normal detection workspace when the space has a source', async () => {
    renderPage();

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDetectionOnboarding')).not.toBeInTheDocument();
  });

  it('shows the locked onboarding to a viewer with no sources or history', () => {
    mockSourcesCount = 0;
    mockCanManage = false;
    renderPage();

    expect(screen.getByTestId('nightshiftDetectionOnboardingLocked')).toBeInTheDocument();
    expect(screen.queryByTestId('recommendedSourcesTableStub')).not.toBeInTheDocument();
  });

  it('shows the Rules tab on the rules route', async () => {
    renderPage('/detections/rules', 'rules');
    expect(await screen.findByTestId('rulesTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionTab-rules')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByTestId('nightshiftDetectionTab-signals')).not.toBeInTheDocument();
  });

  it('shows the Signals tab in developer mode', async () => {
    mockUseDeveloperMode.mockReturnValue({ isDeveloperMode: true });

    renderPage('/detections/signals', 'signals');

    expect(await screen.findByTestId('signalsTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionTab-signals')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the paused detection process status', async () => {
    renderPage();

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionStatus')).toHaveTextContent('Paused');
    expect(screen.getByText('knowledge indicators')).toBeInTheDocument();
    expect(screen.getByText('signals')).toBeInTheDocument();
  });

  it('moves the detection status above the entities rail while the tab body scrolls', async () => {
    renderPage();
    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    const tabBody = screen.getByTestId('nightshiftDetectionTabBody');
    const fullSlot = screen.getByTestId('nightshiftDetectionOverviewFullSlot');
    const compactSlot = screen.getByTestId('nightshiftDetectionOverviewCompactSlot');

    expect(fullSlot).not.toHaveAttribute('data-collapsed');
    expect(compactSlot).toHaveAttribute('data-collapsed', 'true');

    Object.defineProperties(tabBody, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 500 },
    });
    Object.defineProperty(fullSlot, 'offsetHeight', { configurable: true, value: 128 });
    Object.defineProperty(tabBody, 'scrollTop', { configurable: true, value: 9 });
    fireEvent.scroll(tabBody);

    expect(fullSlot).toHaveAttribute('data-collapsed', 'true');
    expect(compactSlot).not.toHaveAttribute('data-collapsed');

    Object.defineProperty(tabBody, 'scrollTop', { configurable: true, value: 0 });
    fireEvent.scroll(tabBody);

    expect(fullSlot).not.toHaveAttribute('data-collapsed');
    expect(compactSlot).toHaveAttribute('data-collapsed', 'true');
  });

  it('keeps the overview expanded when collapsing it would remove the tab overflow', async () => {
    renderPage();
    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    const tabBody = screen.getByTestId('nightshiftDetectionTabBody');
    const fullSlot = screen.getByTestId('nightshiftDetectionOverviewFullSlot');
    const compactSlot = screen.getByTestId('nightshiftDetectionOverviewCompactSlot');

    Object.defineProperties(tabBody, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 320 },
      scrollTop: { configurable: true, value: 9 },
    });
    Object.defineProperty(fullSlot, 'offsetHeight', { configurable: true, value: 128 });
    fireEvent.scroll(tabBody);

    expect(fullSlot).not.toHaveAttribute('data-collapsed');
    expect(compactSlot).toHaveAttribute('data-collapsed', 'true');
  });

  it('shows the overview error instead of zero counts', async () => {
    mockUseDetectionOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderPage();

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionOverviewError')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('nightshiftDetectionOverview')).queryByText('0')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDetectionOverviewEntities')).not.toBeInTheDocument();
  });

  it('falls back to the default time range when the URL range is malformed', async () => {
    renderPage('/detections/events?rangeFrom=now-5zz&rangeTo=now');

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(mockUseDetectionOverview).toHaveBeenCalledWith({ from: 'now-24h', to: 'now' });
  });

  it('keeps entities and every tab filter when switching tabs, but not the page or flyout', async () => {
    const history = renderPage(
      '/detections/events?entity=checkout&entity=expired&unassigned=true&severity=critical&search=errors&rulesSearch=agent&page=3&eventId=event-1'
    );
    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionTab-rules'));
    expect(history.location.pathname).toBe('/detections/rules');
    const params = new URLSearchParams(history.location.search);
    expect(params.getAll('entity')).toEqual(['checkout', 'expired']);
    expect(params.get('unassigned')).toBe('true');
    expect(params.get('rangeFrom')).toBe('now-24h');
    expect(params.get('severity')).toBe('critical');
    expect(params.get('search')).toBe('errors');
    expect(params.get('rulesSearch')).toBe('agent');
    expect(params.has('page')).toBe(false);
    expect(params.has('eventId')).toBe(false);
  });
});
