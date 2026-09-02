/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { ICPSManager } from '@kbn/cps-utils';
import { useIsInfraMlCpsEnabled, useShouldRenderInfraMlCpsUi } from './use_infra_ml_cps';

const mockUseKibanaContextForPlugin = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibanaContextForPlugin: () => mockUseKibanaContextForPlugin(),
}));

const mockCpsService = (
  cps: Partial<CPSPluginStart> | undefined,
  { isFeatureFlagEnabled = true }: { isFeatureFlagEnabled?: boolean } = {}
) => {
  mockUseKibanaContextForPlugin.mockReturnValue({
    services: {
      cps,
      featureFlags: { getBooleanValue: jest.fn().mockReturnValue(isFeatureFlagEnabled) },
    },
  });
};

const createCpsManager = ({
  hasLinkedProjects,
  isReady = true,
}: {
  hasLinkedProjects: boolean;
  isReady?: boolean;
}): ICPSManager => {
  // mirrors the real manager, whose hasLinkedProjects() reports false until whenReady() resolves
  let ready = false;
  return {
    whenReady: jest.fn(() =>
      isReady
        ? Promise.resolve().then(() => {
            ready = true;
          })
        : new Promise<void>(() => {})
    ),
    hasLinkedProjects: jest.fn(() => ready && hasLinkedProjects),
  } as unknown as ICPSManager;
};

describe('useIsInfraMlCpsEnabled', () => {
  it('returns false when the cps plugin is unavailable', () => {
    mockCpsService(undefined);

    const { result } = renderHook(() => useIsInfraMlCpsEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when the pricing tier is not eligible', () => {
    mockCpsService({ isTierEligible: false, cpsManager: {} as CPSPluginStart['cpsManager'] });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when the CPS manager does not exist', () => {
    mockCpsService({ isTierEligible: true, cpsManager: undefined });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled());

    expect(result.current).toBe(false);
  });

  it('returns true when the tier is eligible and the CPS manager exists', () => {
    mockCpsService({ isTierEligible: true, cpsManager: {} as CPSPluginStart['cpsManager'] });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when the feature flag is disabled, regardless of tier and manager', () => {
    mockCpsService(
      { isTierEligible: true, cpsManager: {} as CPSPluginStart['cpsManager'] },
      { isFeatureFlagEnabled: false }
    );

    const { result } = renderHook(() => useIsInfraMlCpsEnabled());

    expect(result.current).toBe(false);
  });
});

describe('useShouldRenderInfraMlCpsUi', () => {
  it('is false when the cps plugin is unavailable', () => {
    mockCpsService(undefined);

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi());

    expect(result.current).toBe(false);
  });

  it('is false when the pricing tier is not eligible, without waiting for readiness', () => {
    mockCpsService({
      isTierEligible: false,
      cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi());

    expect(result.current).toBe(false);
  });

  it('is false when the feature flag is disabled, without waiting for readiness', () => {
    mockCpsService(
      {
        isTierEligible: true,
        cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
      },
      { isFeatureFlagEnabled: false }
    );

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi());

    expect(result.current).toBe(false);
  });

  it('is undefined while readiness is pending', () => {
    mockCpsService({
      isTierEligible: true,
      cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi());

    expect(result.current).toBeUndefined();
  });

  it('becomes true once ready with linked projects', async () => {
    mockCpsService({
      isTierEligible: true,
      cpsManager: createCpsManager({ hasLinkedProjects: true }),
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('becomes false once ready without linked projects', async () => {
    mockCpsService({
      isTierEligible: true,
      cpsManager: createCpsManager({ hasLinkedProjects: false }),
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi());

    await waitFor(() => expect(result.current).toBe(false));
  });
});
