/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { closeAddToCaseModal } from '@kbn/alerting-v2-episodes-ui/components/add_to_case_modal';
import { UniversalAlertsSection } from './universal_alerts_section';
import * as datePickerHook from '../../../../../hooks/use_date_picker_context';
import * as kibanaHook from '../../../../../utils/kibana_react';

const tableProps = jest.fn();
const histogramProps = jest.fn();
const kpisProps = jest.fn();

jest.mock('@kbn/alerting-v2-episodes-ui/components/episodes_table', () => ({
  EpisodesTable: (props: unknown) => {
    tableProps(props);
    return <div data-test-subj="episodesTable" />;
  },
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/episodes_histogram', () => ({
  EpisodesHistogram: (props: unknown) => {
    histogramProps(props);
    return <div data-test-subj="episodesHistogram" />;
  },
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/episodes_kpis', () => ({
  EpisodesKpis: (props: unknown) => {
    kpisProps(props);
    return <div data-test-subj="episodesKpis" />;
  },
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view', () => ({
  useAlertingEpisodesDataView: () => ({ timeFieldName: '@timestamp' }),
}));

const invalidateEpisodeQueries = jest.fn();

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_invalidate_episode_queries', () => ({
  useInvalidateEpisodeQueries: () => invalidateEpisodeQueries,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/add_to_case_modal', () => ({
  ...jest.requireActual('@kbn/alerting-v2-episodes-ui/components/add_to_case_modal'),
  closeAddToCaseModal: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { storage: {}, http: {} } }),
}));

const updateTimeRange = jest.fn();

const providerProps = jest.fn();

const alertingVTwo = {
  AlertsProvider: ({ children, ...rest }: { children: React.ReactNode }) => {
    providerProps(rest);
    return <>{children}</>;
  },
  createAlertingV2HostApp: jest.fn(() => ({})),
} as unknown as AlertingV2PublicStart;

const mockDatePicker = (lastUpdated: number, relativeStart = 'now-15m', relativeEnd = 'now') =>
  jest.spyOn(datePickerHook, 'useDatePickerContext').mockReturnValue({
    relativeStart,
    relativeEnd,
    updateTimeRange,
    lastUpdated,
  } as unknown as ReturnType<typeof datePickerHook.useDatePickerContext>);

describe('UniversalAlertsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatePicker(1);
    jest.spyOn(kibanaHook, 'useKibana').mockReturnValue({
      services: {
        cases: { helpers: { canUseCases: jest.fn() } },
        triggersActionsUi: { getAlertFormatter: jest.fn() },
      },
    } as unknown as ReturnType<typeof kibanaHook.useKibana>);
  });

  it('renders the KPIs, the histogram and the table', () => {
    const { getByTestId } = render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(getByTestId('episodesKpis')).toBeInTheDocument();
    expect(getByTestId('episodesHistogram')).toBeInTheDocument();
    expect(getByTestId('episodesTable')).toBeInTheDocument();
  });

  it('shows active alerts only, the same set Show alerts lands on', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    for (const props of [tableProps, histogramProps, kpisProps]) {
      expect(props).toHaveBeenCalledWith(
        expect.objectContaining({ filterState: { status: ['active'] } })
      );
    }
  });

  it('drives all three from the Overview date picker', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    const timeRange = { from: 'now-15m', to: 'now' };
    for (const props of [tableProps, histogramProps, kpisProps]) {
      expect(props).toHaveBeenCalledWith(expect.objectContaining({ timeRange }));
    }
  });

  it('moves the Overview date picker when the histogram is brushed', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    histogramProps.mock.calls[0][0].onTimeRangeChange({ from: 'now-1h', to: 'now-30m' });

    expect(updateTimeRange).toHaveBeenCalledWith({ start: 'now-1h', end: 'now-30m' });
  });

  it('scrolls through the full set without the capped-results notice', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(tableProps).toHaveBeenCalledWith(
      expect.objectContaining({ showLimitedResultsNotice: false })
    );
    expect(tableProps.mock.calls[0][0].fetchSize).toBeUndefined();
  });

  it('sizes the table to its rows between a floor and a ceiling', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(tableProps).toHaveBeenCalledWith(
      expect.objectContaining({ minHeight: 200, maxHeight: 400 })
    );
  });

  it('leaves actions, bulk actions and the rule flyout to the provider defaults', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    const props = tableProps.mock.calls[0][0];
    expect(props.actions).toBeUndefined();
    expect(props.onRuleNameClick).toBeUndefined();
    expect(props.getRuleDetailsHref).toBeUndefined();
  });

  it("gives the provider Observability's row actions, matching the Alerts page", () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    const { createActions } = providerProps.mock.calls[0][0];
    const actions = createActions({
      rendering: {},
      http: { basePath: { prepend: (p: string) => p } },
      notifications: { toasts: {} },
    });

    expect(actions.map((action: { id: string }) => action.id)).toEqual([
      'OBSERVABILITY_ALERTING_INVESTIGATE_EPISODE',
      'VIEW_V1_ALERT_IN_APP',
      'ALERTING_V2_ADD_EPISODE_TO_CASE',
    ]);
  });

  it('drops Add to case when the cases plugin is unavailable', () => {
    jest.spyOn(kibanaHook, 'useKibana').mockReturnValue({
      services: { triggersActionsUi: { getAlertFormatter: jest.fn() } },
    } as unknown as ReturnType<typeof kibanaHook.useKibana>);
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    const { createActions } = providerProps.mock.calls[0][0];
    const actions = createActions({
      rendering: {},
      http: { basePath: { prepend: (p: string) => p } },
      notifications: { toasts: {} },
    });

    expect(actions.map((action: { id: string }) => action.id)).not.toContain(
      'ALERTING_V2_ADD_EPISODE_TO_CASE'
    );
  });

  it('closes an open add to case modal when the section unmounts', () => {
    const { unmount } = render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);
    jest.mocked(closeAddToCaseModal).mockClear();

    unmount();

    expect(closeAddToCaseModal).toHaveBeenCalledTimes(1);
  });

  it('refetches when the Overview is refreshed without the range changing', () => {
    const { rerender } = render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(invalidateEpisodeQueries).not.toHaveBeenCalled();

    mockDatePicker(2);
    rerender(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(invalidateEpisodeQueries).toHaveBeenCalled();
  });

  it('leaves a range change to the query keys instead of invalidating on top of it', () => {
    const { rerender } = render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    mockDatePicker(2, 'now-1h', 'now-30m');
    rerender(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(invalidateEpisodeQueries).not.toHaveBeenCalled();
  });

  it('keeps the histogram breakdown selector working', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    const { onBreakdownFieldChange } = histogramProps.mock.calls[0][0];
    expect(typeof onBreakdownFieldChange).toBe('function');

    act(() => onBreakdownFieldChange('rule.id'));

    expect(histogramProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ breakdownField: 'rule.id' })
    );
  });
});
