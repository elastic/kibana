/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ENTITY_INVENTORY_PERFORMANCE_OVERLAY_ENABLED } from '../../../common/feature_flags';
import { createAppServicesMock, createCoreStartMock } from '../../mocks';
import { PROBES_FIXTURE, QUERIES_FIXTURE, TIMINGS_FIXTURE } from './__fixtures__/list_diagnostics';
import { PerformanceOverlay } from './performance_overlay';
import type { PerformanceRecorder } from './performance_recorder';
import { createPerformanceRecorder } from './performance_recorder';

const recordList = (recorder: PerformanceRecorder, browserMs: number) =>
  recorder.record({
    route: 'host/_list',
    startedAt: Date.UTC(2026, 10, 19, 10),
    browserMs,
    status: 'ok',
    serverMs: TIMINGS_FIXTURE.totalMs,
    errorMessage: null,
    list: {
      took: 52,
      queries: QUERIES_FIXTURE,
      probes: PROBES_FIXTURE,
      timings: TIMINGS_FIXTURE,
      truncated: false,
      rowCount: 120,
      errorCount: 1,
    },
  });

const renderOverlay = (enabled: boolean) => {
  const core = createCoreStartMock();
  core.featureFlags.useBooleanValue.mockReturnValue(enabled);
  const services = createAppServicesMock(core);
  const recorder = createPerformanceRecorder();
  const ui = () => (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <PerformanceOverlay recorder={recorder} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const { rerender } = render(ui());
  const setEnabled = (next: boolean) => {
    core.featureFlags.useBooleanValue.mockReturnValue(next);
    rerender(ui());
  };
  return { core, recorder, setEnabled };
};

describe('PerformanceOverlay', () => {
  it('renders nothing while the flag is off', () => {
    const { core, recorder } = renderOverlay(false);
    recordList(recorder, 60);

    expect(core.featureFlags.useBooleanValue).toHaveBeenCalledWith(
      ENTITY_INVENTORY_PERFORMANCE_OVERLAY_ENABLED,
      false
    );
    expect(screen.queryByTestId('entityInventoryPerformanceBadge')).not.toBeInTheDocument();
  });

  it('shows the browser time of the last _list call in the badge, following the recorder', async () => {
    const { recorder } = renderOverlay(true);

    expect(await screen.findByTestId('entityInventoryPerformanceBadge')).toHaveTextContent(
      '_list — ms'
    );

    act(() => recordList(recorder, 61.26));
    expect(screen.getByTestId('entityInventoryPerformanceBadge')).toHaveTextContent(
      '_list 61.3 ms'
    );
  });

  it('appears and disappears as the flag flips', async () => {
    const { setEnabled } = renderOverlay(false);
    expect(screen.queryByTestId('entityInventoryPerformanceBadge')).not.toBeInTheDocument();

    setEnabled(true);
    expect(await screen.findByTestId('entityInventoryPerformanceBadge')).toBeInTheDocument();

    setEnabled(false);
    expect(screen.queryByTestId('entityInventoryPerformanceBadge')).not.toBeInTheDocument();
  });

  it('opens a flyout with the phases, one row per probe and query, and the call history', async () => {
    const { recorder } = renderOverlay(true);
    act(() => {
      recorder.record({
        route: 'types',
        startedAt: 0,
        browserMs: 5,
        status: 'aborted',
        serverMs: null,
        errorMessage: 'The request was aborted',
        list: null,
      });
      recordList(recorder, 61.26);
    });

    fireEvent.click(await screen.findByTestId('entityInventoryPerformanceBadge'));

    const summary = await screen.findByTestId('entityInventoryPerformanceSummary');
    expect(summary).toHaveTextContent('Browser end to end (ms)61.3');
    expect(summary).toHaveTextContent('Server total (ms)52.0');
    expect(summary).toHaveTextContent('Network and serialization (ms)9.2');
    expect(summary).toHaveTextContent('Slowest query, ES took (ms)38.0');
    expect(summary).toHaveTextContent('Sum of ES took over queries (ms)38.0');

    const queryRows = within(screen.getByTestId('entityInventoryPerformanceQueries'))
      .getAllByRole('row')
      .slice(1);
    expect(queryRows).toHaveLength(2);
    expect(queryRows[0]).toHaveTextContent('metrics-*');
    expect(queryRows[0]).toHaveTextContent('12.3');
    expect(queryRows[0]).toHaveTextContent('45.6');
    expect(queryRows[0]).toHaveTextContent('2.0 KB');
    expect(queryRows[0]).toHaveTextContent('3/3');
    expect(queryRows[1]).toHaveTextContent('logs-*');
    expect(queryRows[1]).toHaveTextContent('Unknown column [host.name]');

    const probeRows = within(screen.getByTestId('entityInventoryPerformanceProbes'))
      .getAllByRole('row')
      .slice(1);
    expect(probeRows).toHaveLength(1);
    expect(probeRows[0]).toHaveTextContent('time_series');

    const historyRows = screen.getAllByTestId('entityInventoryPerformanceHistoryRow');
    expect(historyRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('host/_list'),
      expect.stringContaining('Aborted'),
    ]);
  });
});
