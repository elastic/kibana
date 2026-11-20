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
import {
  ERRORS_FIXTURE,
  PROBES_FIXTURE,
  QUERIES_FIXTURE,
  TIMINGS_FIXTURE,
} from './__fixtures__/list_diagnostics';
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
      errors: ERRORS_FIXTURE,
      unavailableColumns: [
        { column: 'os', indexPattern: 'logs-*', field: 'host.os.name' },
        { column: 'os', indexPattern: 'logs-*', field: 'host.os.name' },
      ],
      rowCount: 120,
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

  it('shows the browser time of the latest call in the badge, following the recorder', async () => {
    const { recorder } = renderOverlay(true);

    expect(await screen.findByTestId('entityInventoryPerformanceBadge')).toHaveTextContent(
      'Inventory performance · —'
    );

    act(() => recordList(recorder, 61.26));
    expect(screen.getByTestId('entityInventoryPerformanceBadge')).toHaveTextContent(
      'Inventory performance · 61.3 ms'
    );
  });

  it('appears and disappears as the flag flips', async () => {
    const { setEnabled } = renderOverlay(false);
    expect(screen.queryByTestId('entityInventoryPerformanceBadge')).not.toBeInTheDocument();

    setEnabled(true);
    expect(await screen.findByTestId('entityInventoryPerformanceBadge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inventory performance · —' })).toBe(
      screen.getByTestId('entityInventoryPerformanceBadge')
    );

    setEnabled(false);
    expect(screen.queryByTestId('entityInventoryPerformanceBadge')).not.toBeInTheDocument();
  });

  it('opens a flyout with a titled breakdown, errors in their rows, one row per probe and query, and the history last', async () => {
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

    const historyRows = screen.getAllByTestId('entityInventoryPerformanceHistoryRow');
    expect(historyRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('host list'),
      expect.stringContaining('Aborted'),
    ]);
    expect(historyRows[0]).toHaveTextContent('61.3 ms52.0 ms3');

    await screen.findByTestId('entityInventoryPerformanceListDetail');
    // The history comes last, after the selected call and its unavailable columns.
    expect(
      screen
        .getAllByTestId(/^entityInventoryPerformance(ListDetail|UnavailableColumns|History)$/)
        .map((element) => element.getAttribute('data-test-subj'))
    ).toEqual([
      'entityInventoryPerformanceListDetail',
      'entityInventoryPerformanceUnavailableColumns',
      'entityInventoryPerformanceHistory',
    ]);

    expect(screen.getByTestId('entityInventoryPerformanceDetailTitle')).toHaveTextContent(
      /^host list$/
    );
    const subtitle = screen.getByTestId('entityInventoryPerformanceDetailSubtitle');
    expect(subtitle).toHaveTextContent('OK · 61.3 ms round trip · 120 rows');
    expect(subtitle).not.toHaveTextContent('truncated');

    const timingRows = within(screen.getByTestId('entityInventoryPerformanceTimings'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(timingRows).toEqual([
      expect.stringMatching(/Total \(browser\).*61\.3 ms.*100%/),
      expect.stringMatching(/Network and serialization.*9\.2 ms.*15%/),
      expect.stringMatching(/Server.*52\.0 ms.*85%/),
      expect.stringMatching(/Definition lookup.*0\.42 ms.*1%/),
      expect.stringMatching(/Planning.*6\.1 ms.*10%/),
      expect.stringMatching(/Probes.*4\.4 ms.*7%/),
      // Planning less its probes.
      expect.stringMatching(/Query generation.*1\.7 ms.*3%/),
      expect.stringMatching(/Queries \(run in parallel\).*42\.3 ms.*69%/),
      expect.stringMatching(/Merge and sort.*3\.2 ms.*5%/),
    ]);

    const elasticsearchRows = within(screen.getByTestId('entityInventoryPerformanceElasticsearch'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(elasticsearchRows).toEqual([
      expect.stringMatching(/Slowest query.*38\.0 ms.*3\.0 ms/),
      expect.stringMatching(/Total query time.*38\.0 ms.*3\.0 ms/),
      expect.stringMatching(/Total CPU time.*12\.3 ms.*12\.3 ms/),
      expect.stringMatching(/Total driver time.*45\.6 ms.*45\.6 ms/),
      expect.stringMatching(/Documents visited.*1,500 docs.*1,500 docs/),
      expect.stringMatching(/Values read.*4,200 values.*4,200 values/),
      expect.stringMatching(/Bytes read.*2\.0 KB.*2\.0 KB/),
    ]);

    const queries = screen.getByTestId('entityInventoryPerformanceQueries');
    expect(
      within(queries)
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    ).toEqual([
      'Details',
      'Index pattern',
      'Engine',
      'Status',
      'ES time',
      'CPU time',
      'Docs',
      'Rows',
    ]);
    const queryRows = within(queries)
      .getAllByRole('row')
      .filter((row) => within(row).queryByTestId('entityInventoryPerformanceRowExpand'));
    expect(queryRows).toHaveLength(2);
    expect(queryRows[0]).toHaveTextContent('metrics-*');
    expect(queryRows[0]).toHaveTextContent('TS');
    expect(queryRows[0]).not.toHaveTextContent('41.5 ms');
    expect(queryRows[0]).toHaveTextContent('38.0 ms');
    expect(queryRows[0]).toHaveTextContent('12.3 ms');
    expect(queryRows[0]).toHaveTextContent('1,500 docs');
    expect(queryRows[0]).toHaveTextContent('120 rows');
    expect(queryRows[0]).not.toHaveTextContent('2.0 KB');
    expect(
      within(queryRows[0]).queryByTestId('entityInventoryPerformanceRowError')
    ).not.toBeInTheDocument();
    expect(queryRows[1]).toHaveTextContent('logs-*');
    expect(
      within(queryRows[1]).getByTestId('entityInventoryPerformanceRowError')
    ).toBeInTheDocument();

    // Every row starts collapsed, errored ones included.
    expect(screen.queryByTestId('entityInventoryPerformanceRowDetail')).not.toBeInTheDocument();

    // An expanded errored query shows its status and reason first.
    fireEvent.click(within(queryRows[1]).getByTestId('entityInventoryPerformanceRowExpand'));
    const errorDetail = within(queries).getByTestId('entityInventoryPerformanceRowDetail');
    expect(
      within(errorDetail).getByTestId('entityInventoryPerformanceRowErrorDetail')
    ).toHaveTextContent('Error 400Unknown column [host.name]');
    expect(errorDetail.firstElementChild).toBe(
      within(errorDetail).getByTestId('entityInventoryPerformanceRowErrorDetail')
    );
    fireEvent.click(within(queryRows[1]).getByTestId('entityInventoryPerformanceRowExpand'));

    fireEvent.click(within(queryRows[0]).getByTestId('entityInventoryPerformanceRowExpand'));
    const queryDetail = within(queries).getByTestId('entityInventoryPerformanceRowDetail');
    expect(queryDetail).toHaveTextContent('Driver time45.6 ms');
    expect(queryDetail).toHaveTextContent('Values read4,200 values');
    expect(queryDetail).toHaveTextContent('rows_emitted3,100 rows');
    expect(queryDetail).toHaveTextContent('Bytes read2.0 KB');
    expect(queryDetail).toHaveTextContent('Shards3/3');
    expect(queryDetail).toHaveTextContent('TS metrics-* | STATS BY host.name');
    expect(
      within(queryDetail).queryByTestId('entityInventoryPerformanceRowErrorDetail')
    ).not.toBeInTheDocument();

    const probes = screen.getByTestId('entityInventoryPerformanceProbes');
    const probeRows = within(probes)
      .getAllByRole('row')
      .filter((row) => within(row).queryByTestId('entityInventoryPerformanceRowExpand'));
    expect(probeRows).toHaveLength(2);
    expect(
      within(probes)
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    ).toEqual(['Details', 'Index pattern', 'Plans', 'Status', 'ES time']);
    expect(probeRows[0]).toHaveTextContent('metrics-*TS + FROMOK3.0 ms');
    expect(probeRows[1]).toHaveTextContent('traces-*NoneError');
    expect(within(probes).queryByTestId('entityInventoryPerformanceRowDetail')).toBeNull();
    fireEvent.click(within(probeRows[1]).getByTestId('entityInventoryPerformanceRowExpand'));
    expect(
      within(within(probes).getByTestId('entityInventoryPerformanceRowDetail')).getByTestId(
        'entityInventoryPerformanceRowErrorDetail'
      )
    ).toHaveTextContent('ErrorNo index matches traces-*');

    // Only the error no query or probe row accounts for is listed apart.
    const otherErrors = within(screen.getByTestId('entityInventoryPerformanceOtherErrors'))
      .getAllByRole('row')
      .slice(1);
    expect(otherErrors.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/apm-\*.*503.*Cluster unavailable/),
    ]);

    expect(screen.getByTestId('entityInventoryPerformanceUnavailableColumns')).toHaveTextContent(
      'Unavailable columns (1)'
    );
  });

  it('clamps query generation at zero when the probes outlast planning', async () => {
    const { recorder } = renderOverlay(true);
    act(() =>
      recorder.record({
        route: 'host/_list',
        startedAt: 0,
        browserMs: 60,
        status: 'ok',
        serverMs: TIMINGS_FIXTURE.totalMs,
        errorMessage: null,
        list: {
          took: 52,
          queries: [],
          probes: [],
          timings: { ...TIMINGS_FIXTURE, planningMs: 4.0, probesMs: 4.4 },
          truncated: false,
          errors: [],
          unavailableColumns: [],
          rowCount: 0,
        },
      })
    );

    fireEvent.click(await screen.findByTestId('entityInventoryPerformanceBadge'));

    const queryGeneration = within(await screen.findByTestId('entityInventoryPerformanceTimings'))
      .getAllByRole('row')
      .find((row) => row.textContent?.startsWith('Query generation'));
    expect(queryGeneration).toHaveTextContent(/0\.00 ms.*0%/);
  });

  it('flags a truncated call in the subtitle', async () => {
    const { recorder } = renderOverlay(true);
    act(() =>
      recorder.record({
        route: 'host/_list',
        startedAt: 0,
        browserMs: 10,
        status: 'ok',
        serverMs: TIMINGS_FIXTURE.totalMs,
        errorMessage: null,
        list: {
          took: 52,
          queries: QUERIES_FIXTURE.slice(0, 1),
          probes: PROBES_FIXTURE.slice(0, 1),
          timings: TIMINGS_FIXTURE,
          truncated: true,
          errors: [],
          unavailableColumns: [],
          rowCount: 1,
        },
      })
    );

    fireEvent.click(await screen.findByTestId('entityInventoryPerformanceBadge'));

    expect(await screen.findByTestId('entityInventoryPerformanceDetailSubtitle')).toHaveTextContent(
      /1 row · truncated$/
    );
  });

  it('leaves the errors sections out of a call without errors', async () => {
    const { recorder } = renderOverlay(true);
    act(() =>
      recorder.record({
        route: 'host/_list',
        startedAt: 0,
        browserMs: 10,
        status: 'ok',
        serverMs: TIMINGS_FIXTURE.totalMs,
        errorMessage: null,
        list: {
          took: 52,
          queries: QUERIES_FIXTURE.slice(0, 1),
          probes: PROBES_FIXTURE.slice(0, 1),
          timings: TIMINGS_FIXTURE,
          truncated: false,
          errors: [],
          unavailableColumns: [],
          rowCount: 120,
        },
      })
    );

    fireEvent.click(await screen.findByTestId('entityInventoryPerformanceBadge'));

    expect(await screen.findByTestId('entityInventoryPerformanceListDetail')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryPerformanceOtherErrors')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryPerformanceRowDetail')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('entityInventoryPerformanceUnavailableColumns')
    ).not.toBeInTheDocument();
  });
});
