/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { useEnvironment } from '../../../../hooks/use_environment';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useOverviewFilters } from '../../../../hooks/use_overview_filters';
import { useOverviewKuery } from '../../../../hooks/use_overview_search';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { VitalsTrendPanel } from './vitals_trend_panel';

jest.mock('../../../../hooks/use_environment');
jest.mock('../../../../hooks/use_kibana_services');
jest.mock('../../../../hooks/use_overview_filters');
jest.mock('../../../../hooks/use_overview_search');
jest.mock('../../../../hooks/use_time_range');

interface EmbeddableProps {
  attributes: LensAttributes;
  timeRange: { from: string; to: string };
  query: { language: string; query: string };
  lastReloadRequestTime?: number;
  withDefaultActions?: boolean;
}

const EmbeddableComponent = jest.fn((_props: EmbeddableProps) => (
  <div data-test-subj="lensEmbeddable" />
));

const lastProps = (): EmbeddableProps => {
  const [props] = EmbeddableComponent.mock.calls.at(-1) ?? [];
  if (!props) {
    throw new Error('The Lens embeddable did not render');
  }
  return props;
};

const queryOf = (props: EmbeddableProps): string => JSON.stringify(props.attributes.state);

const renderPanel = (lastReloadRequestTime?: number) =>
  render(
    <EuiProvider>
      <VitalsTrendPanel serviceName="shop" lastReloadRequestTime={lastReloadRequestTime} />
    </EuiProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  jest.mocked(useKibanaServices).mockReturnValue({
    lens: { EmbeddableComponent },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: 'production', setEnvironment: jest.fn() });
  jest.mocked(useOverviewFilters).mockReturnValue({
    filters: { browser: [{ value: 'Chrome', exclude: false }] },
  } as unknown as ReturnType<typeof useOverviewFilters>);
  jest.mocked(useOverviewKuery).mockReturnValue({ kuery: 'user.id : "u-1"', setKuery: jest.fn() });
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-24h', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
});

describe('VitalsTrendPanel', () => {
  it("charts LCP by default, over the Overview's range, query, environment and filters", () => {
    renderPanel();

    const props = lastProps();
    expect(props.timeRange).toEqual({ from: 'now-24h', to: 'now' });
    expect(props.query).toEqual({ language: 'kuery', query: 'user.id : "u-1"' });
    expect(props.withDefaultActions).toBe(true);
    expect(queryOf(props)).toContain('== \\"lcp\\"');
    expect(queryOf(props)).toContain('production');
    expect(queryOf(props)).toContain('filter_browser IN (\\"Chrome\\")');
  });

  it('charts the vital picked, and keeps it for the next visit', () => {
    const { unmount } = renderPanel();

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewVitalTrend-inp'));
    expect(queryOf(lastProps())).toContain('== \\"inp\\"');
    unmount();

    renderPanel();
    expect(queryOf(lastProps())).toContain('== \\"inp\\"');
  });

  it("reloads the chart when the Overview's Refresh is clicked", () => {
    renderPanel(1234);

    expect(lastProps().lastReloadRequestTime).toBe(1234);
  });

  it('is left out where Lens is disabled', () => {
    jest
      .mocked(useKibanaServices)
      .mockReturnValue({} as unknown as ReturnType<typeof useKibanaServices>);

    renderPanel();

    expect(screen.queryByTestId('digitalExperienceOverviewVitalTrend')).not.toBeInTheDocument();
  });
});
