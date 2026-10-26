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
import type { UseReportErrorShownParams } from './use_report_error_shown';
import { useReportErrorShown } from './use_report_error_shown';

const setup = (initialProps: UseReportErrorShownParams, { strict = false } = {}) => {
  const core = coreMock.createStart();
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
    const tree = <KibanaContextProvider services={core}>{children}</KibanaContextProvider>;
    return strict ? <React.StrictMode>{tree}</React.StrictMode> : tree;
  };
  const hook = renderHook((props: UseReportErrorShownParams) => useReportErrorShown(props), {
    initialProps,
    wrapper,
  });
  return { ...hook, reportEvent: core.analytics.reportEvent as jest.Mock };
};

const shown: UseReportErrorShownParams = {
  errorClass: 'server',
  isShown: true,
  surface: 'watch_detail',
};

describe('useReportErrorShown', () => {
  it('reports an error when it appears', () => {
    const { reportEvent } = setup(shown);

    expect(reportEvent.mock.calls).toEqual([
      ['alertzero_ui_error_shown', { error_class: 'server', surface: 'watch_detail' }],
    ]);
  });

  it('reports nothing while no error is shown', () => {
    const { reportEvent } = setup({ ...shown, isShown: false });

    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('reports a visible error once, however often it re-renders or its class changes', () => {
    const { reportEvent, rerender } = setup(shown);

    rerender(shown);
    rerender({ ...shown, errorClass: 'network' });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports again when the error goes away and comes back', () => {
    const { reportEvent, rerender } = setup(shown);

    rerender({ ...shown, isShown: false });
    rerender({ ...shown, errorClass: 'forbidden' });

    expect(reportEvent.mock.calls).toEqual([
      ['alertzero_ui_error_shown', { error_class: 'server', surface: 'watch_detail' }],
      ['alertzero_ui_error_shown', { error_class: 'forbidden', surface: 'watch_detail' }],
    ]);
  });

  it('reports a failure once while its request is fetched again, though the error hides meanwhile', () => {
    const { reportEvent, rerender } = setup(shown);

    rerender({ ...shown, isRefetching: true, isShown: false });
    rerender(shown);
    rerender({ ...shown, isRefetching: true, isShown: false });
    rerender(shown);

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports again once a refetch settles without the error and the error later comes back', () => {
    const { reportEvent, rerender } = setup(shown);

    rerender({ ...shown, isRefetching: true, isShown: false });
    rerender({ ...shown, isRefetching: false, isShown: false });
    rerender(shown);

    expect(reportEvent).toHaveBeenCalledTimes(2);
  });

  it('reports a new failure after the reset key changes, though the next request is still loading', () => {
    const { reportEvent, rerender } = setup({ ...shown, resetKey: 'watch-a' });

    rerender({ ...shown, isRefetching: true, isShown: false, resetKey: 'watch-b' });
    rerender({ ...shown, errorClass: 'network', resetKey: 'watch-b' });

    expect(reportEvent.mock.calls).toEqual([
      ['alertzero_ui_error_shown', { error_class: 'server', surface: 'watch_detail' }],
      ['alertzero_ui_error_shown', { error_class: 'network', surface: 'watch_detail' }],
    ]);
  });

  it('keeps one occurrence while the reset key stays the same', () => {
    const { reportEvent, rerender } = setup({ ...shown, resetKey: 'watch-a' });

    rerender({ ...shown, isRefetching: true, isShown: false, resetKey: 'watch-a' });
    rerender({ ...shown, resetKey: 'watch-a' });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports once under StrictMode, which runs effects twice', () => {
    const { reportEvent } = setup(shown, { strict: true });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });
});
