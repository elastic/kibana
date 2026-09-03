/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { of } from 'rxjs';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { CPSPluginStart } from '@kbn/cps/public';
import { type ICPSManager, ProjectRoutingAccess } from '@kbn/cps-utils';
import {
  MlCpsCapabilityContext,
  MlCpsCapabilityProvider,
  useInfraMlCpsPickerAccess,
  useIsInfraMlCpsEnabled,
  useShouldRenderInfraMlCpsUi,
} from './use_infra_ml_cps';

const LOADING_MESSAGE = 'Loading Machine Learning configuration...';

const mockUseKibanaContextForPlugin = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibanaContextForPlugin: () => mockUseKibanaContextForPlugin(),
}));

const mockServices = ({
  cps,
  isFeatureFlagEnabled = true,
  mlInfo,
}: {
  cps: Partial<CPSPluginStart> | undefined;
  isFeatureFlagEnabled?: boolean;
  mlInfo?: jest.Mock;
}) => {
  mockUseKibanaContextForPlugin.mockReturnValue({
    services: {
      application: { currentAppId$: of('logs') },
      cps,
      featureFlags: { getBooleanValue: jest.fn().mockReturnValue(isFeatureFlagEnabled) },
      ml: mlInfo ? { mlApi: { mlInfo } } : undefined,
      observabilityShared: {
        navigation: {
          PageTemplate: ({ children }: PropsWithChildren) => <div>{children}</div>,
        },
      },
    },
  });
};

const enabledCps = (): Partial<CPSPluginStart> => ({
  isTierEligible: true,
  cpsManager: {} as CPSPluginStart['cpsManager'],
});

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

const withMlCpsCapability = (value: boolean): FC<PropsWithChildren> =>
  function MlCpsCapabilityWrapper({ children }) {
    return (
      <MlCpsCapabilityContext.Provider value={value}>{children}</MlCpsCapabilityContext.Provider>
    );
  };

describe('useIsInfraMlCpsEnabled', () => {
  it('returns false when the cps plugin is unavailable', () => {
    mockServices({ cps: undefined });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('returns false when the pricing tier is not eligible', () => {
    mockServices({ cps: { ...enabledCps(), isTierEligible: false } });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('returns false when the CPS manager does not exist', () => {
    mockServices({ cps: { isTierEligible: true, cpsManager: undefined } });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('returns false when the feature flag is disabled, regardless of tier and manager', () => {
    mockServices({ cps: enabledCps(), isFeatureFlagEnabled: false });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('returns false when the ML CPS capability is disabled', () => {
    mockServices({ cps: enabledCps() });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled(), {
      wrapper: withMlCpsCapability(false),
    });

    expect(result.current).toBe(false);
  });

  it('returns false without a capability provider, as the fail-safe default', () => {
    mockServices({ cps: enabledCps() });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled());

    expect(result.current).toBe(false);
  });

  it('returns true when every condition of the gate holds', () => {
    mockServices({ cps: enabledCps() });

    const { result } = renderHook(() => useIsInfraMlCpsEnabled(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(true);
  });
});

describe('useShouldRenderInfraMlCpsUi', () => {
  it('is false when the cps plugin is unavailable', () => {
    mockServices({ cps: undefined });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('is false when the pricing tier is not eligible, without waiting for readiness', () => {
    mockServices({
      cps: {
        isTierEligible: false,
        cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
      },
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('is false when the feature flag is disabled, without waiting for readiness', () => {
    mockServices({
      cps: {
        isTierEligible: true,
        cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
      },
      isFeatureFlagEnabled: false,
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBe(false);
  });

  it('is false when the ML CPS capability is disabled, without waiting for readiness', () => {
    mockServices({
      cps: {
        isTierEligible: true,
        cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
      },
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(false),
    });

    expect(result.current).toBe(false);
  });

  it('is undefined while readiness is pending', () => {
    mockServices({
      cps: {
        isTierEligible: true,
        cpsManager: createCpsManager({ hasLinkedProjects: true, isReady: false }),
      },
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(true),
    });

    expect(result.current).toBeUndefined();
  });

  it('becomes true once ready with linked projects', async () => {
    mockServices({
      cps: {
        isTierEligible: true,
        cpsManager: createCpsManager({ hasLinkedProjects: true }),
      },
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(true),
    });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('becomes false once ready without linked projects', async () => {
    mockServices({
      cps: {
        isTierEligible: true,
        cpsManager: createCpsManager({ hasLinkedProjects: false }),
      },
    });

    const { result } = renderHook(() => useShouldRenderInfraMlCpsUi(), {
      wrapper: withMlCpsCapability(true),
    });

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('MlCpsCapabilityProvider', () => {
  const CapabilityProbe: FC = () => {
    const isEnabled = useIsInfraMlCpsEnabled();
    return <div>{isEnabled ? 'cps-enabled' : 'cps-disabled'}</div>;
  };

  const renderProvider = ({ initialPath = '/anomalies' }: { initialPath?: string } = {}) =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <MlCpsCapabilityProvider>
          <CapabilityProbe />
        </MlCpsCapabilityProvider>
      </MemoryRouter>
    );

  it('renders children immediately without requesting ML info when the platform gate fails', () => {
    const mlInfo = jest.fn();
    mockServices({ cps: undefined, mlInfo });

    renderProvider();

    expect(screen.getByText('cps-disabled')).toBeInTheDocument();
    expect(mlInfo).not.toHaveBeenCalled();
  });

  it('renders children immediately when the ML api is unavailable', () => {
    mockServices({ cps: enabledCps() });

    renderProvider();

    expect(screen.getByText('cps-disabled')).toBeInTheDocument();
  });

  it('renders children immediately without requesting ML info outside the ML pages', () => {
    const mlInfo = jest.fn();
    mockServices({ cps: enabledCps(), mlInfo });

    renderProvider({ initialPath: '/stream' });

    expect(screen.getByText('cps-disabled')).toBeInTheDocument();
    expect(mlInfo).not.toHaveBeenCalled();
  });

  it('fetches on the log categories page as well', async () => {
    const mlInfo = jest.fn().mockResolvedValue({ isMlCpsEnabled: true });
    mockServices({ cps: enabledCps(), mlInfo });

    renderProvider({ initialPath: '/log-categories' });

    expect(await screen.findByText('cps-enabled')).toBeInTheDocument();
  });

  it('holds rendering on a loading page while the capability is fetched', () => {
    jest.useFakeTimers();
    try {
      const mlInfo = jest.fn().mockReturnValue(new Promise(() => {}));
      mockServices({ cps: enabledCps(), mlInfo });

      renderProvider();

      expect(screen.getByText(LOADING_MESSAGE)).toBeInTheDocument();
      expect(screen.queryByText(/cps-/)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails closed when the request never settles, once the timeout elapses', async () => {
    jest.useFakeTimers();
    try {
      const mlInfo = jest.fn().mockReturnValue(new Promise(() => {}));
      mockServices({ cps: enabledCps(), mlInfo });

      renderProvider();
      expect(screen.getByText(LOADING_MESSAGE)).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(35_000);
      });

      expect(screen.getByText('cps-disabled')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('provides an enabled capability to consumers once fetched', async () => {
    const mlInfo = jest.fn().mockResolvedValue({ isMlCpsEnabled: true });
    mockServices({ cps: enabledCps(), mlInfo });

    renderProvider();

    expect(await screen.findByText('cps-enabled')).toBeInTheDocument();
    expect(screen.queryByText(LOADING_MESSAGE)).not.toBeInTheDocument();
  });

  it('provides a disabled capability to consumers once fetched', async () => {
    const mlInfo = jest.fn().mockResolvedValue({ isMlCpsEnabled: false });
    mockServices({ cps: enabledCps(), mlInfo });

    renderProvider();

    expect(await screen.findByText('cps-disabled')).toBeInTheDocument();
  });

  it('fails closed on a fetch error', async () => {
    const mlInfo = jest.fn().mockRejectedValue(new Error('network error'));
    mockServices({ cps: enabledCps(), mlInfo });

    renderProvider();

    expect(await screen.findByText('cps-disabled')).toBeInTheDocument();
    expect(mlInfo).toHaveBeenCalledTimes(1);
  });
});

describe('useInfraMlCpsPickerAccess', () => {
  const renderPickerAccessHook = ({
    isMlCpsCapabilityEnabled,
  }: {
    isMlCpsCapabilityEnabled: boolean;
  }) => {
    const registerAppAccess = jest.fn();
    mockServices({
      cps: {
        isTierEligible: true,
        cpsManager: { registerAppAccess } as unknown as CPSPluginStart['cpsManager'],
      },
    });

    const rendered = renderHook(() => useInfraMlCpsPickerAccess(), {
      wrapper: withMlCpsCapability(isMlCpsCapabilityEnabled),
    });

    return { ...rendered, registerAppAccess };
  };

  it('registers a read-only picker for the current app when the gate holds', () => {
    const { registerAppAccess } = renderPickerAccessHook({ isMlCpsCapabilityEnabled: true });

    const [appId, resolver] = registerAppAccess.mock.calls[0];
    expect(appId).toBe('logs');
    expect(resolver('any-location')).toBe(ProjectRoutingAccess.READONLY);
  });

  it('registers a hidden picker when the gate is disabled', () => {
    const { registerAppAccess } = renderPickerAccessHook({ isMlCpsCapabilityEnabled: false });

    const [appId, resolver] = registerAppAccess.mock.calls[0];
    expect(appId).toBe('logs');
    expect(resolver('any-location')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('re-registers a hidden picker on unmount', () => {
    const { registerAppAccess, unmount } = renderPickerAccessHook({
      isMlCpsCapabilityEnabled: true,
    });

    unmount();

    const [appId, resolver] = registerAppAccess.mock.calls[registerAppAccess.mock.calls.length - 1];
    expect(appId).toBe('logs');
    expect(resolver('any-location')).toBe(ProjectRoutingAccess.DISABLED);
  });
});
