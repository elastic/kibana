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

  it('reports once under StrictMode, which runs effects twice', () => {
    const { reportEvent } = setup(shown, { strict: true });

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });
});
