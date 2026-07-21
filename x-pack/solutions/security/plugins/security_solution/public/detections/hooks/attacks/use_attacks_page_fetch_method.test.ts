/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  fetchQueryAttacks,
  fetchQueryUnifiedAlerts,
} from '../../containers/detection_engine/alerts/api';
import { useAttacksPageFetchMethod } from './use_attacks_page_fetch_method';

jest.mock('../../../common/hooks/use_experimental_features');

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.MockedFunction<
  typeof useIsExperimentalFeatureEnabled
>;

describe('useAttacksPageFetchMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fetchQueryUnifiedAlerts when publicAttacksApiEnabled is false', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAttacksPageFetchMethod());

    expect(result.current).toBe(fetchQueryUnifiedAlerts);
  });

  it('returns fetchQueryAttacks when publicAttacksApiEnabled is true', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useAttacksPageFetchMethod());

    expect(result.current).toBe(fetchQueryAttacks);
  });
});
