/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { UseReportHomeOpenedParams } from './use_report_home_opened';
import { useReportHomeOpened } from './use_report_home_opened';

const setup = (initialProps: UseReportHomeOpenedParams, { strict = false } = {}) => {
  const core = coreMock.createStart();
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
    const tree = <KibanaContextProvider services={core}>{children}</KibanaContextProvider>;
    return strict ? <React.StrictMode>{tree}</React.StrictMode> : tree;
  };
  const hook = renderHook((props: UseReportHomeOpenedParams) => useReportHomeOpened(props), {
    initialProps,
    wrapper,
  });
  return { ...hook, reportEvent: core.analytics.reportEvent as jest.Mock };
};

describe('useReportHomeOpened', () => {
  it('waits for the queue data, then reports once with the bucketed count', () => {
    const { reportEvent, rerender } = setup({ isSettled: false, openCount: undefined });
    expect(reportEvent).not.toHaveBeenCalled();

    rerender({ isSettled: true, openCount: 7 });

    expect(reportEvent.mock.calls).toEqual([
      ['alertzero_ui_home_opened', { default_filters_changed: false, queue_size_bucket: '1_10' }],
    ]);
  });

  it('reports an unknown size when the open count failed to load', () => {
    const { reportEvent } = setup({ isSettled: true, openCount: undefined });

    expect(reportEvent.mock.calls).toEqual([
      [
        'alertzero_ui_home_opened',
        { default_filters_changed: false, queue_size_bucket: 'unknown' },
      ],
    ]);
  });

  it('does not report again on a refetch or a focus poll', () => {
    const { reportEvent, rerender } = setup({ isSettled: true, openCount: 7 });

    rerender({ isSettled: true, openCount: 300 });
    rerender({ isSettled: false, openCount: 300 });
    rerender({ isSettled: true, openCount: 0 });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('does not report again when a failed count loads on a retry', () => {
    const { reportEvent, rerender } = setup({ isSettled: true, openCount: undefined });

    rerender({ isSettled: true, openCount: 7 });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports once under StrictMode, which runs effects twice', () => {
    const { reportEvent } = setup({ isSettled: true, openCount: 0 }, { strict: true });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports again for a new mount, a new visit to the home page', () => {
    const first = setup({ isSettled: true, openCount: 1 });
    first.unmount();
    const second = setup({ isSettled: true, openCount: 1 });

    expect([first.reportEvent.mock.calls.length, second.reportEvent.mock.calls.length]).toEqual([
      1, 1,
    ]);
  });
});
