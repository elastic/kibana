/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useOpenFindingInSystemFlyout } from './use_open_finding_in_system_flyout';

jest.mock('../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: jest.fn(),
}));

jest.mock('react-redux', () => ({ useStore: () => ({}) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({}) }));

jest.mock('../../shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: unknown }) => children,
}));

jest.mock('../../shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({ size: 's' }),
}));

jest.mock('../misconfiguration/main', () => ({ Misconfiguration: () => null }));
jest.mock('../vulnerability/main', () => ({ Vulnerability: () => null }));

const mockFlyoutRef = { close: jest.fn(), onClose: Promise.resolve() };
const mockOpenSystemFlyout = jest.fn().mockReturnValue(mockFlyoutRef);

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { overlays: { openSystemFlyout: mockOpenSystemFlyout } } }),
}));

const useIsNewFlyoutEnabledMock = useIsNewFlyoutEnabled as jest.Mock;

describe('useOpenFindingInSystemFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when the new flyout system is disabled', () => {
    useIsNewFlyoutEnabledMock.mockReturnValue(false);
    const { result } = renderHook(() => useOpenFindingInSystemFlyout());
    expect(result.current).toBeUndefined();
  });

  it('opens a system flyout for a misconfiguration finding when enabled', () => {
    useIsNewFlyoutEnabledMock.mockReturnValue(true);
    const { result } = renderHook(() => useOpenFindingInSystemFlyout());

    const handle = result.current?.openMisconfigurationFinding({
      resourceId: 'resource-1',
      ruleId: 'rule-1',
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start' })
    );
    expect(handle?.onClose).toBe(mockFlyoutRef.onClose);

    handle?.close();
    expect(mockFlyoutRef.close).toHaveBeenCalledTimes(1);
  });

  it('opens a system flyout for a vulnerability finding when enabled', () => {
    useIsNewFlyoutEnabledMock.mockReturnValue(true);
    const { result } = renderHook(() => useOpenFindingInSystemFlyout());

    const handle = result.current?.openVulnerabilityFinding({
      vulnerabilityId: 'CVE-1',
      resourceId: 'resource-1',
      packageName: 'pkg',
      packageVersion: '1.0.0',
      eventId: 'event-1',
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start' })
    );
    expect(handle?.onClose).toBe(mockFlyoutRef.onClose);

    handle?.close();
    expect(mockFlyoutRef.close).toHaveBeenCalledTimes(1);
  });
});
