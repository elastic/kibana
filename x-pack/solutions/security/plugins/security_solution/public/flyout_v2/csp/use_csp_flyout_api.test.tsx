/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { useCspFlyoutApi } from './use_csp_flyout_api';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';

vi.mock('react-redux-v7', () => {
  const mocked = { useStore: () => ({}) };
  return { ...mocked, default: mocked };
});
vi.mock('react-router-dom', () => {
  const mocked = { useHistory: () => ({}) };
  return { ...mocked, default: mocked };
});
vi.mock('../../common/hooks/is_in_security_app');

vi.mock('../shared/components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: ({ children }: { children: unknown }) => children,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../shared/utils/build_flyout_nav_title', () => {
  const mocked = {
    buildFlyoutNavTitle: (title: string) => title,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../shared/hooks/use_default_flyout_properties', () => {
  const mocked = {
    useDefaultDocumentFlyoutProperties: () => ({ size: 's' }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./misconfiguration/main', () => {
  const mocked = { Misconfiguration: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./vulnerability/main', () => {
  const mocked = { Vulnerability: () => null };
  return { ...mocked, default: mocked };
});

const mockFlyoutRef = { close: vi.fn(), onClose: Promise.resolve() };
const mockOpenSystemFlyout = vi.fn().mockReturnValue(mockFlyoutRef);
const mockReportEvent = vi.fn();

vi.mock('../../common/lib/kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: mockReportEvent },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

const useIsInSecurityAppMock = useIsInSecurityApp as Mock;

describe('useCspFlyoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIsInSecurityAppMock.mockReturnValue(true);
  });

  it('opens a system flyout for a misconfiguration finding', () => {
    const { result } = renderHook(() => useCspFlyoutApi());

    const handle = result.current.openMisconfigurationFinding({
      resourceId: 'resource-1',
      ruleId: 'rule-1',
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(handle.onClose).toBe(mockFlyoutRef.onClose);

    handle.close();
    expect(mockFlyoutRef.close).toHaveBeenCalledTimes(1);
  });

  it('opens a system flyout for a vulnerability finding', () => {
    const { result } = renderHook(() => useCspFlyoutApi());

    const handle = result.current.openVulnerabilityFinding({
      vulnerabilityId: 'CVE-1',
      resourceId: 'resource-1',
      packageName: 'pkg',
      packageVersion: '1.0.0',
      eventId: 'event-1',
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(handle.onClose).toBe(mockFlyoutRef.onClose);

    handle.close();
    expect(mockFlyoutRef.close).toHaveBeenCalledTimes(1);
  });

  it('opens a misconfiguration finding as a child, forwarding the optional title', () => {
    const { result } = renderHook(() => useCspFlyoutApi());

    result.current.openMisconfigurationFindingAsChild(
      { resourceId: 'resource-1', ruleId: 'rule-1' },
      { title: 'my-host' }
    );

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        session: 'inherit',
        title: 'my-host',
        historyKey: documentFlyoutHistoryKey,
      })
    );
  });

  it('opens a vulnerability finding as a child, forwarding the optional title', () => {
    const { result } = renderHook(() => useCspFlyoutApi());

    result.current.openVulnerabilityFindingAsChild(
      {
        vulnerabilityId: 'CVE-1',
        resourceId: 'resource-1',
        packageName: 'pkg',
        packageVersion: '1.0.0',
        eventId: 'event-1',
      },
      { title: 'my-host' }
    );

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        session: 'inherit',
        title: 'my-host',
        historyKey: documentFlyoutHistoryKey,
      })
    );
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    useIsInSecurityAppMock.mockReturnValue(false);
    const { result } = renderHook(() => useCspFlyoutApi());

    result.current.openMisconfigurationFinding({ resourceId: 'resource-1', ruleId: 'rule-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
