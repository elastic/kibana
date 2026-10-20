/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
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

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { storage: {}, http: {} } }),
}));

const updateTimeRange = jest.fn();

const alertingVTwo = {
  AlertsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createAlertingV2HostApp: jest.fn(() => ({})),
} as unknown as AlertingV2PublicStart;

describe('UniversalAlertsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(datePickerHook, 'useDatePickerContext').mockReturnValue({
      relativeStart: 'now-15m',
      relativeEnd: 'now',
      updateTimeRange,
    } as unknown as ReturnType<typeof datePickerHook.useDatePickerContext>);
    jest.spyOn(kibanaHook, 'useKibana').mockReturnValue({
      services: {},
    } as unknown as ReturnType<typeof kibanaHook.useKibana>);
  });

  it('renders the KPIs, the histogram and the table', () => {
    const { getByTestId } = render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    expect(getByTestId('episodesKpis')).toBeInTheDocument();
    expect(getByTestId('episodesHistogram')).toBeInTheDocument();
    expect(getByTestId('episodesTable')).toBeInTheDocument();
  });

  it('shows every alert status, since the Overview has no filter bar to narrow one', () => {
    render(<UniversalAlertsSection alertingVTwo={alertingVTwo} />);

    for (const props of [tableProps, histogramProps, kpisProps]) {
      expect(props).toHaveBeenCalledWith(expect.objectContaining({ filterState: {} }));
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
