/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useObservabilityAlertingCapabilities } from './use_observability_alerting_capabilities';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        capabilities: {
          apm: { save: true, show: true, 'alerting:save': true, 'alerting:show': true },
          infrastructure: { save: true, show: true },
          logs: { save: true, show: true },
          slo: { write: true, read: true },
          uptime: { save: true, show: true, 'alerting:save': true },
        },
      },
    },
  }),
}));

const mockUseKibana = useKibana as jest.Mock;

describe('useObservabilityAlertingCapabilities', () => {
  it('returns undefined when application.capabilities is undefined', () => {
    mockUseKibana.mockReturnValueOnce({
      services: {
        application: undefined,
      },
    });
    const { result } = renderHook(() => useObservabilityAlertingCapabilities('apm'));
    expect(result.current).toBeUndefined();
  });

  it('returns the correct capabilities for each feature ID', () => {
    const { result } = renderHook(() => useObservabilityAlertingCapabilities('apm'));
    expect(result.current).toEqual({ save: true, show: true });

    const { result: infraResult } = renderHook(() =>
      useObservabilityAlertingCapabilities('infrastructure')
    );
    expect(infraResult.current).toEqual({ save: true, show: true });

    const { result: logsResult } = renderHook(() => useObservabilityAlertingCapabilities('logs'));
    expect(logsResult.current).toEqual({ save: true, show: true });

    const { result: sloResult } = renderHook(() => useObservabilityAlertingCapabilities('slo'));
    expect(sloResult.current).toEqual({ save: true, show: true });

    const { result: uptimeResult } = renderHook(() =>
      useObservabilityAlertingCapabilities('uptime')
    );
    expect(uptimeResult.current).toEqual({ save: true, show: true });
  });

  it('returns the falsy capabilities when application.capabilities is an empty object', () => {
    mockUseKibana.mockReturnValueOnce({
      services: {
        application: {
          capabilities: {},
        },
      },
    });
    const { result } = renderHook(() => useObservabilityAlertingCapabilities('apm'));
    expect(result.current).toEqual({ save: false, show: false });
  });

  it('returns the correct capabilities when application.capabilities has some properties set to false', () => {
    mockUseKibana.mockReturnValueOnce({
      services: {
        application: {
          capabilities: {
            apm: { save: false, show: true, 'alerting:save': true, 'alerting:show': true },
          },
        },
      },
    });
    const { result } = renderHook(() => useObservabilityAlertingCapabilities('apm'));
    expect(result.current).toEqual({ save: false, show: true });
  });
});
