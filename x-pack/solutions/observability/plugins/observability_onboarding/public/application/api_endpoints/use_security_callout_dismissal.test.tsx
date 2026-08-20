/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { useSecurityCalloutDismissal } from './use_security_callout_dismissal';

const STORAGE_KEY = 'observabilityOnboarding.apiEndpoints.dismissedSecurityCallout';

describe('useSecurityCalloutDismissal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with no dismissed endpoints', () => {
    const { result } = renderHook(() => useSecurityCalloutDismissal());

    expect(result.current.dismissedByEndpointId).toEqual({});
  });

  it('persists a dismissal per endpoint', () => {
    const { result } = renderHook(() => useSecurityCalloutDismissal());

    act(() => {
      result.current.dismissCallout(ApiEndpointId.Prometheus);
    });

    expect(result.current.dismissedByEndpointId).toEqual({
      [ApiEndpointId.Prometheus]: true,
    });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      [ApiEndpointId.Prometheus]: true,
    });
  });

  it('keeps earlier dismissals when dismissing another endpoint in the same mount', () => {
    const { result } = renderHook(() => useSecurityCalloutDismissal());

    act(() => {
      result.current.dismissCallout(ApiEndpointId.Prometheus);
    });
    act(() => {
      result.current.dismissCallout(ApiEndpointId.Elasticsearch);
    });

    expect(result.current.dismissedByEndpointId).toEqual({
      [ApiEndpointId.Prometheus]: true,
      [ApiEndpointId.Elasticsearch]: true,
    });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      [ApiEndpointId.Prometheus]: true,
      [ApiEndpointId.Elasticsearch]: true,
    });
  });

  it('recovers from corrupt storage when persisting a dismissal', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-json');

    const { result } = renderHook(() => useSecurityCalloutDismissal());

    act(() => {
      result.current.dismissCallout(ApiEndpointId.Prometheus);
    });

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      [ApiEndpointId.Prometheus]: true,
    });
  });

  it('reads dismissals back from storage on mount', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [ApiEndpointId.OpenTelemetry]: true })
    );

    const { result } = renderHook(() => useSecurityCalloutDismissal());

    expect(result.current.dismissedByEndpointId).toEqual({
      [ApiEndpointId.OpenTelemetry]: true,
    });
  });

  it('ignores stored values that are not strictly true', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ prometheus: 'false', opentelemetry: true })
    );

    const { result } = renderHook(() => useSecurityCalloutDismissal());

    expect(result.current.dismissedByEndpointId).toEqual({
      [ApiEndpointId.OpenTelemetry]: true,
    });
  });
});
