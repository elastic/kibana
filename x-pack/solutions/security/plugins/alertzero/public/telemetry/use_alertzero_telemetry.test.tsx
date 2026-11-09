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
import { useAlertZeroTelemetry } from './use_alertzero_telemetry';

const renderWith = (services: object) =>
  renderHook(() => useAlertZeroTelemetry(), {
    wrapper: ({ children }: React.PropsWithChildren) => (
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    ),
  });

describe('useAlertZeroTelemetry', () => {
  it('reports through core analytics', () => {
    const core = coreMock.createStart();
    const { result } = renderWith(core);

    result.current.reportEvent('alertzero_ui_queue_filtered', { filter_type: 'impact' });

    expect(core.analytics.reportEvent).toHaveBeenCalledWith('alertzero_ui_queue_filtered', {
      filter_type: 'impact',
    });
  });

  it('never throws when reporting fails', () => {
    const core = coreMock.createStart();
    (core.analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('unregistered event type');
    });
    const { result } = renderWith(core);

    expect(() =>
      result.current.reportEvent('alertzero_ui_queue_filtered', { filter_type: 'impact' })
    ).not.toThrow();
  });

  it('does nothing without analytics in the context', () => {
    const { result } = renderWith({});

    expect(() =>
      result.current.reportEvent('alertzero_ui_queue_filtered', { filter_type: 'impact' })
    ).not.toThrow();
  });
});
