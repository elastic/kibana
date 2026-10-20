/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CspSecuritySolutionContext, OpenFindingInSystemFlyoutHandle } from '../../types';
import { SecuritySolutionContext } from '../../application/security_solution_context';
import { useExpandableFlyoutCsp } from './use_expandable_flyout_csp';

const openFlyout = jest.fn();
const closeFlyout = jest.fn();
const useOnExpandableFlyoutClose = jest.fn();

const buildRecord = (source: Record<string, unknown>) =>
  ({ raw: { _source: source } } as unknown as DataTableRecord);

const buildFlyoutHandle = () => {
  let resolveClose = () => {};
  const onClose = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });
  const handle: OpenFindingInSystemFlyoutHandle = { close: jest.fn(), onClose };
  return { handle, resolveClose };
};

const renderCspFlyoutHook = (
  contextOverrides: Partial<CspSecuritySolutionContext> = {},
  flyoutType?: 'misconfiguration' | 'vulnerability'
) => {
  const context: CspSecuritySolutionContext = {
    getFiltersGlobalComponent: jest.fn(),
    getSpyRouteComponent: jest.fn(),
    useExpandableFlyoutApi: () =>
      ({
        openFlyout,
        closeFlyout,
      } as unknown as ReturnType<
        NonNullable<CspSecuritySolutionContext['useExpandableFlyoutApi']>
      >),
    useOnExpandableFlyoutClose,
    ...contextOverrides,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SecuritySolutionContext.Provider value={context}>{children}</SecuritySolutionContext.Provider>
  );

  return renderHook(() => useExpandableFlyoutCsp(flyoutType), { wrapper });
};

describe('useExpandableFlyoutCsp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a null onExpandDocClick when the expandable flyout API is unavailable', () => {
    const { result } = renderCspFlyoutHook({ useExpandableFlyoutApi: undefined });
    expect(result.current.onExpandDocClick).toBeNull();
  });

  describe('legacy expandable-flyout panels (no system flyout opener)', () => {
    it('opens the misconfiguration panel through the expandable flyout API', () => {
      const { result } = renderCspFlyoutHook();
      const record = buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } });

      act(() => {
        result.current.onExpandDocClick?.(record);
      });

      expect(openFlyout).toHaveBeenCalledWith({
        right: {
          id: 'findings-misconfiguration-panel',
          params: { resourceId: 'resource-1', ruleId: 'rule-1' },
        },
      });
    });

    it('closes the expandable flyout when deselecting', () => {
      const { result } = renderCspFlyoutHook();

      act(() => {
        result.current.onExpandDocClick?.(undefined);
      });

      expect(closeFlyout).toHaveBeenCalledTimes(1);
    });
  });

  describe('system flyout (new flyout system enabled)', () => {
    it('opens a misconfiguration finding in the system flyout instead of the legacy panel', () => {
      const { handle } = buildFlyoutHandle();
      const openMisconfigurationFinding = jest.fn().mockReturnValue(handle);
      const { result } = renderCspFlyoutHook({
        useOpenFindingInSystemFlyout: () => ({
          openMisconfigurationFinding,
          openVulnerabilityFinding: jest.fn(),
        }),
      });
      const record = buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } });

      act(() => {
        result.current.onExpandDocClick?.(record);
      });

      expect(openMisconfigurationFinding).toHaveBeenCalledWith({
        resourceId: 'resource-1',
        ruleId: 'rule-1',
      });
      expect(openFlyout).not.toHaveBeenCalled();
    });

    it('opens a vulnerability finding in the system flyout instead of the legacy panel', () => {
      const { handle } = buildFlyoutHandle();
      const openVulnerabilityFinding = jest.fn().mockReturnValue(handle);
      const { result } = renderCspFlyoutHook(
        {
          useOpenFindingInSystemFlyout: () => ({
            openMisconfigurationFinding: jest.fn(),
            openVulnerabilityFinding,
          }),
        },
        'vulnerability'
      );
      const record = buildRecord({
        vulnerability: { id: 'CVE-1' },
        resource: { id: 'resource-1' },
        package: { name: 'pkg', version: '1.0.0' },
        event: { id: 'event-1' },
      });

      act(() => {
        result.current.onExpandDocClick?.(record);
      });

      expect(openVulnerabilityFinding).toHaveBeenCalledWith({
        vulnerabilityId: 'CVE-1',
        resourceId: 'resource-1',
        packageName: 'pkg',
        packageVersion: '1.0.0',
        eventId: 'event-1',
      });
      expect(openFlyout).not.toHaveBeenCalled();
    });

    it('closes the active system flyout (not the legacy flyout) when deselecting', () => {
      const { handle } = buildFlyoutHandle();
      const openMisconfigurationFinding = jest.fn().mockReturnValue(handle);
      const { result } = renderCspFlyoutHook({
        useOpenFindingInSystemFlyout: () => ({
          openMisconfigurationFinding,
          openVulnerabilityFinding: jest.fn(),
        }),
      });
      const record = buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } });

      act(() => {
        result.current.onExpandDocClick?.(record);
      });
      act(() => {
        result.current.onExpandDocClick?.(undefined);
      });

      expect(handle.close).toHaveBeenCalledTimes(1);
      expect(closeFlyout).not.toHaveBeenCalled();
    });

    it('does not close the previous system flyout when switching rows without deselecting', () => {
      // Regression test: core's system flyout service explicitly avoids synchronously closing
      // `session: 'start'` flyouts because `unmountComponentAtNode` can trigger a stale-ref
      // cleanup that closes *all* active system flyouts, including the one just opened. So
      // switching findings must only swap which handle we track, never call `.close()`.
      const { handle: handleA } = buildFlyoutHandle();
      const { handle: handleB } = buildFlyoutHandle();
      const openMisconfigurationFinding = jest
        .fn()
        .mockReturnValueOnce(handleA)
        .mockReturnValueOnce(handleB);
      const { result } = renderCspFlyoutHook({
        useOpenFindingInSystemFlyout: () => ({
          openMisconfigurationFinding,
          openVulnerabilityFinding: jest.fn(),
        }),
      });

      act(() => {
        result.current.onExpandDocClick?.(
          buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } })
        );
      });
      act(() => {
        result.current.onExpandDocClick?.(
          buildRecord({ resource: { id: 'resource-2' }, rule: { id: 'rule-2' } })
        );
      });

      expect(handleA.close).not.toHaveBeenCalled();
      expect(handleB.close).not.toHaveBeenCalled();
    });

    it('closes the current (not a stale) system flyout when deselecting after switching rows', () => {
      const { handle: handleA } = buildFlyoutHandle();
      const { handle: handleB } = buildFlyoutHandle();
      const openMisconfigurationFinding = jest
        .fn()
        .mockReturnValueOnce(handleA)
        .mockReturnValueOnce(handleB);
      const { result } = renderCspFlyoutHook({
        useOpenFindingInSystemFlyout: () => ({
          openMisconfigurationFinding,
          openVulnerabilityFinding: jest.fn(),
        }),
      });

      act(() => {
        result.current.onExpandDocClick?.(
          buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } })
        );
      });
      act(() => {
        result.current.onExpandDocClick?.(
          buildRecord({ resource: { id: 'resource-2' }, rule: { id: 'rule-2' } })
        );
      });
      act(() => {
        result.current.onExpandDocClick?.(undefined);
      });

      expect(handleB.close).toHaveBeenCalledTimes(1);
      expect(handleA.close).not.toHaveBeenCalled();
    });

    it('ignores a stale onClose from a replaced finding (does not clobber the current one)', async () => {
      const { handle: handleA, resolveClose: resolveCloseA } = buildFlyoutHandle();
      const { handle: handleB } = buildFlyoutHandle();
      const openMisconfigurationFinding = jest
        .fn()
        .mockReturnValueOnce(handleA)
        .mockReturnValueOnce(handleB);
      const { result } = renderCspFlyoutHook({
        useOpenFindingInSystemFlyout: () => ({
          openMisconfigurationFinding,
          openVulnerabilityFinding: jest.fn(),
        }),
      });

      act(() => {
        result.current.onExpandDocClick?.(
          buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } })
        );
      });
      const recordB = buildRecord({ resource: { id: 'resource-2' }, rule: { id: 'rule-2' } });
      act(() => {
        result.current.onExpandDocClick?.(recordB);
      });

      // The orphaned flyout for finding A eventually closes on its own (e.g. the user still
      // had it open in the background and dismissed it). That must not reset `expandedDoc`,
      // since finding B is the current selection.
      await act(async () => {
        resolveCloseA();
        await handleA.onClose;
      });

      expect(result.current.expandedDoc).toBe(recordB);
    });

    it('resets the expanded doc when the system flyout is closed by the user', async () => {
      const { handle, resolveClose } = buildFlyoutHandle();
      const openMisconfigurationFinding = jest.fn().mockReturnValue(handle);
      const { result } = renderCspFlyoutHook({
        useOpenFindingInSystemFlyout: () => ({
          openMisconfigurationFinding,
          openVulnerabilityFinding: jest.fn(),
        }),
      });
      const record = buildRecord({ resource: { id: 'resource-1' }, rule: { id: 'rule-1' } });

      act(() => {
        result.current.onExpandDocClick?.(record);
      });
      expect(result.current.expandedDoc).toBe(record);

      await act(async () => {
        resolveClose();
        await handle.onClose;
      });

      expect(result.current.expandedDoc).toBeUndefined();
    });
  });
});
