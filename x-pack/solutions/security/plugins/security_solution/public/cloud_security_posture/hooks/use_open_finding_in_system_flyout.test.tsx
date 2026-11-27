/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { useOpenFindingInSystemFlyout } from './use_open_finding_in_system_flyout';

jest.mock('../../flyout_v2/use_flyout_api');

const useFlyoutApiMock = useFlyoutApi as jest.Mock;

const openMisconfigurationFinding = jest.fn();
const openVulnerabilityFinding = jest.fn();

describe('useOpenFindingInSystemFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFlyoutApiMock.mockReturnValue({ openMisconfigurationFinding, openVulnerabilityFinding });
  });

  it('returns the openers from useFlyoutApi', () => {
    const { result } = renderHook(() => useOpenFindingInSystemFlyout());

    expect(result.current).toEqual({ openMisconfigurationFinding, openVulnerabilityFinding });
  });
});
