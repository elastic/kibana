/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useTilesErrorNotice } from './use_tiles_error_notice';

jest.mock('../../../../../common/hooks/use_app_toasts', () => ({ useAppToasts: jest.fn() }));

const addDanger = jest.fn();

interface Props {
  titles: string[];
  settled: boolean;
  runKey: string;
}

const render = (initialProps: Props) =>
  renderHook(({ titles, settled, runKey }: Props) => useTilesErrorNotice(titles, settled, runKey), {
    initialProps,
  });

describe('useTilesErrorNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The same shape as the real hook: the danger toast is on the toasts service, `api`.
    (useAppToasts as jest.Mock).mockReturnValue({ api: { addDanger } });
  });

  it('shows one toast that names every tile that failed', () => {
    render({
      titles: ['Severely alerting', 'Watchlisted & alerting', 'New & alerting'],
      settled: true,
      runKey: '24h:{}',
    });

    expect(addDanger).toHaveBeenCalledTimes(1);
    expect(addDanger).toHaveBeenCalledWith({
      title: "Some metrics couldn't load",
      text: "Severely alerting, Watchlisted & alerting and New & alerting didn't load. Refresh the page to try again.",
    });
  });

  it('names a single tile', () => {
    render({ titles: ['Anomalous'], settled: true, runKey: '24h:{}' });
    expect(addDanger.mock.calls[0][0].text).toBe(
      "Anomalous didn't load. Refresh the page to try again."
    );
  });

  it('waits until the counts have settled, so it can name them all', () => {
    const { rerender } = render({ titles: ['Anomalous'], settled: false, runKey: '24h:{}' });
    expect(addDanger).not.toHaveBeenCalled();

    rerender({ titles: ['Anomalous', 'Risk movers'], settled: true, runKey: '24h:{}' });
    expect(addDanger).toHaveBeenCalledTimes(1);
    expect(addDanger.mock.calls[0][0].text).toContain('Anomalous and Risk movers');
  });

  it('shows nothing when no tile failed', () => {
    render({ titles: [], settled: true, runKey: '24h:{}' });
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('shows one toast per page load, however often it renders', () => {
    const { rerender } = render({ titles: ['Anomalous'], settled: true, runKey: '24h:{}' });
    rerender({ titles: ['Anomalous'], settled: true, runKey: '24h:{}' });
    rerender({ titles: ['Anomalous', 'Risk movers'], settled: true, runKey: '24h:{}' });
    expect(addDanger).toHaveBeenCalledTimes(1);
  });

  it('shows another for a new range or filter that fails too, and when a failed one comes back', () => {
    const { rerender } = render({ titles: ['Anomalous'], settled: true, runKey: '24h:{}' });
    rerender({ titles: [], settled: true, runKey: '7d:{}' });
    expect(addDanger).toHaveBeenCalledTimes(1);

    rerender({ titles: ['Anomalous'], settled: true, runKey: '7d:{}' });
    expect(addDanger).toHaveBeenCalledTimes(2);

    rerender({ titles: [], settled: true, runKey: '30d:{}' });
    rerender({ titles: ['Anomalous'], settled: true, runKey: '24h:{}' });
    expect(addDanger).toHaveBeenCalledTimes(3);
  });
});
