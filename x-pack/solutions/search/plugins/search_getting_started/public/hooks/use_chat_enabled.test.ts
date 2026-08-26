/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGettingStartChatEnabled } from './use_chat_enabled';
import { useKibana } from './use_kibana';
import { SEARCH_GETTING_STARTED_CHAT_FEATURE_FLAG } from '@kbn/search-shared-ui';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const mockServices = (
  overrides: Partial<{
    agentBuilder: object | undefined;
    isServerlessEnabled: boolean;
    featureFlagValue: boolean;
  }> = {}
) => {
  const agentBuilder = 'agentBuilder' in overrides ? overrides.agentBuilder : {};
  const isServerlessEnabled = overrides.isServerlessEnabled ?? true;
  const featureFlagValue = overrides.featureFlagValue ?? true;
  mockUseKibana.mockReturnValue({
    services: {
      agentBuilder,
      cloud: { isServerlessEnabled },
      featureFlags: {
        getBooleanValue: jest
          .fn()
          .mockImplementation((flag: string, defaultValue: boolean) =>
            flag === SEARCH_GETTING_STARTED_CHAT_FEATURE_FLAG ? featureFlagValue : defaultValue
          ),
      },
    },
  });
};

describe('useGettingStartChatEnabled', () => {
  it('returns true when serverless is enabled, agentBuilder is present, and feature flag is on', () => {
    mockServices();

    const { result } = renderHook(() => useGettingStartChatEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when cloud is not available', () => {
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {},
        cloud: undefined,
        featureFlags: { getBooleanValue: jest.fn().mockReturnValue(true) },
      },
    });

    const { result } = renderHook(() => useGettingStartChatEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when agentBuilder is not available', () => {
    mockServices({ agentBuilder: undefined });

    const { result } = renderHook(() => useGettingStartChatEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when cloud.isServerlessEnabled is false', () => {
    mockServices({ isServerlessEnabled: false });

    const { result } = renderHook(() => useGettingStartChatEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when the feature flag is disabled', () => {
    mockServices({ featureFlagValue: false });

    const { result } = renderHook(() => useGettingStartChatEnabled());

    expect(result.current).toBe(false);
  });
});
