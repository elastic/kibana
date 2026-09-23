/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import {
  INFRA_POD_SCHEMA_SELECTOR_DEFAULT,
  INFRA_POD_SCHEMA_SELECTOR_FEATURE_FLAG,
} from '../../common/pod_schema_selector_feature_flag';
import { useIsPodSchemaSelectorEnabled } from './use_is_pod_schema_selector_enabled';
import { useKibanaContextForPlugin } from './use_kibana';

jest.mock('./use_kibana');

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

/**
 * The core mock resolves flags to the fallback the caller passed in, which is the behaviour of the
 * real service when no provider or override defines the flag.
 */
const setupMocks = (resolvedValue?: boolean) => {
  const { featureFlags } = coreMock.createStart();

  if (resolvedValue !== undefined) {
    featureFlags.useBooleanValue.mockReturnValue(resolvedValue);
  }

  useKibanaContextForPluginMock.mockReturnValue({
    services: { featureFlags },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);

  return featureFlags.useBooleanValue;
};

describe('useIsPodSchemaSelectorEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to disabled when the flag is not defined', () => {
    const useBooleanValue = setupMocks();

    const { result } = renderHook(() => useIsPodSchemaSelectorEnabled());

    expect(result.current).toBe(false);
    expect(useBooleanValue).toHaveBeenCalledWith(
      INFRA_POD_SCHEMA_SELECTOR_FEATURE_FLAG,
      INFRA_POD_SCHEMA_SELECTOR_DEFAULT
    );
  });

  it('returns true when the flag is enabled', () => {
    setupMocks(true);

    const { result } = renderHook(() => useIsPodSchemaSelectorEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when the flag is disabled', () => {
    setupMocks(false);

    const { result } = renderHook(() => useIsPodSchemaSelectorEnabled());

    expect(result.current).toBe(false);
  });
});
