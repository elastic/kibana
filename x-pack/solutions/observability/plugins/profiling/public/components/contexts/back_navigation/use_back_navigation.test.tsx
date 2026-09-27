/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useHistory } from 'react-router-dom';
import type { AppHeaderBack } from '@kbn/app-header';
import type { ProfilingSetupStatus } from '../../../services';
import type { ProfilingDependencies } from '../profiling_dependencies/profiling_dependencies_context';
import { ProfilingDependenciesContextProvider } from '../profiling_dependencies/profiling_dependencies_context';
import { ProfilingSetupStatusContext } from '../profiling_setup_status/profiling_setup_status_context';
import {
  hasBackNavigation,
  ROUTES_WITH_BACK_NAVIGATION,
  useBackNavigation,
} from './use_back_navigation';

// useBackNavigation only accesses start.core.http.basePath.prepend. Use a non-empty prefix so
// prepend assertions are not vacuously true.
const dependencies = {
  start: {
    core: {
      http: {
        basePath: {
          prepend: (p: string) => `/base${p}`,
        },
      },
    },
  },
} as unknown as ProfilingDependencies;

// The only back target the hook ever returns: the plugin root, labelled with the app name.
const pluginRootTarget: AppHeaderBack = {
  href: '/base/app/profiling',
  label: 'Universal Profiling',
};

const CONTENT_ROUTES = ['/stacktraces/threads', '/flamegraphs/flamegraph', '/functions/topn', '/'];

// Utility routes that deliberately stay out of ROUTES_WITH_BACK_NAVIGATION.
const UTILITY_ROUTES = ['/delete_data_instructions', '/profiling-not-enabled'];

// Build a valid ProfilingSetupStatus, overriding only what each test case needs.
const makeStatus = (overrides: Partial<ProfilingSetupStatus>): ProfilingSetupStatus => ({
  profiling_enabled: true,
  has_setup: true,
  has_data: true,
  pre_8_9_1_data: false,
  has_required_role: true,
  ...overrides,
});

// Renders useBackNavigation inside the provider tree. Returns the RTL result plus a `renders`
// log (every hook return value across all renders) and `updateStatus` to drive status changes
// post-mount without remounting.
const renderBackNavigation = ({
  initialEntry,
  initialStatus,
}: {
  initialEntry: string;
  initialStatus?: ProfilingSetupStatus;
}) => {
  const renders: Array<AppHeaderBack | undefined> = [];

  // Captured during each render of Wrapper; always current after mount.
  let setStatus: Dispatch<SetStateAction<ProfilingSetupStatus | undefined>> | undefined;

  const Wrapper = ({ children }: React.PropsWithChildren) => {
    const [profilingSetupStatus, setProfilingSetupStatus] = useState<
      ProfilingSetupStatus | undefined
    >(initialStatus);
    setStatus = setProfilingSetupStatus;
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <ProfilingDependenciesContextProvider value={dependencies}>
          <ProfilingSetupStatusContext.Provider
            value={{ profilingSetupStatus, setProfilingSetupStatus }}
          >
            {children}
          </ProfilingSetupStatusContext.Provider>
        </ProfilingDependenciesContextProvider>
      </MemoryRouter>
    );
  };

  const { result, ...rest } = renderHook(
    () => {
      const back = useBackNavigation();
      renders.push(back);
      return { back, history: useHistory() };
    },
    { wrapper: Wrapper }
  );

  // setStatus is always defined after the first render; the non-null assertion is safe.
  const updateStatus = (next: ProfilingSetupStatus | undefined) => {
    act(() => setStatus!(next));
  };

  return { result, renders, ...rest, updateStatus };
};

describe('hasBackNavigation', () => {
  it.each(ROUTES_WITH_BACK_NAVIGATION)('returns true for %s', (route) => {
    expect(hasBackNavigation(route)).toBe(true);
  });

  it.each([...CONTENT_ROUTES, ...UTILITY_ROUTES])('returns false for %s', (route) => {
    expect(hasBackNavigation(route)).toBe(false);
  });

  it('compares the exact pathname, not a prefix', () => {
    expect(hasBackNavigation('/settings/foo')).toBe(false);
    expect(hasBackNavigation('/settings?x=1')).toBe(false);
  });
});

describe('useBackNavigation', () => {
  describe('routes without a back button', () => {
    it.each([...CONTENT_ROUTES, ...UTILITY_ROUTES])('returns undefined on %s', (route) => {
      const { result } = renderBackNavigation({
        initialEntry: route,
        // Provide resolved status so an undefined result cannot be attributed to the
        // /add-data-instructions status guard.
        initialStatus: makeStatus({ has_data: true }),
      });
      expect(result.current.back).toBeUndefined();
    });

    it('returns undefined even when the route has a query string', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/flamegraphs/flamegraph?kuery=foo&rangeFrom=now-15m',
      });
      expect(result.current.back).toBeUndefined();
    });
  });

  describe('routes with a back button', () => {
    it.each(ROUTES_WITH_BACK_NAVIGATION)(
      'returns the base-path-prefixed plugin root for %s',
      (route) => {
        const { result } = renderBackNavigation({
          initialEntry: route,
          // Provide resolved status so /add-data-instructions does not suppress the button.
          initialStatus: makeStatus({ has_data: true }),
        });
        expect(result.current.back).toEqual(pluginRootTarget);
      }
    );

    it('ignores the query string when matching the route', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/settings?rangeFrom=now-15m&rangeTo=now',
      });
      expect(result.current.back).toEqual(pluginRootTarget);
    });

    it('always points at the plugin root regardless of the previously visited route', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/flamegraphs/flamegraph?kuery=foo&rangeFrom=now-15m',
      });
      expect(result.current.back).toBeUndefined();

      act(() => result.current.history.push('/settings'));

      expect(result.current.back).toEqual(pluginRootTarget);
    });

    it('drops the back button again when navigating to a content route', () => {
      const { result } = renderBackNavigation({ initialEntry: '/storage-explorer' });
      expect(result.current.back).toEqual(pluginRootTarget);

      act(() => result.current.history.push('/functions/topn'));

      expect(result.current.back).toBeUndefined();
    });
  });

  describe('/add-data-instructions status guard', () => {
    it('returns undefined while setup status is unresolved — prevents a flash during the loading screen', () => {
      // On a cold load, profilingSetupStatus is undefined until CheckSetup's fetch settles.
      const { result } = renderBackNavigation({ initialEntry: '/add-data-instructions' });
      expect(result.current.back).toBeUndefined();
    });

    it('stays undefined when status resolves with has_data: false', () => {
      const { result, renders, updateStatus } = renderBackNavigation({
        initialEntry: '/add-data-instructions',
      });

      updateStatus(makeStatus({ has_data: false }));

      expect(result.current.back).toBeUndefined();
      // Every render since mount must be undefined — no intermediate back value.
      expect(renders.every((v) => v === undefined)).toBe(true);
    });

    it('returns the plugin root when has_data is true', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/add-data-instructions',
        initialStatus: makeStatus({ has_data: true }),
      });
      expect(result.current.back).toEqual(pluginRootTarget);
    });

    it('transitions from undefined to the plugin root when has_data becomes true', () => {
      // A user with data who navigates from the menu to /add-data-instructions should see the
      // back button once the status fetch settles.
      const { result, updateStatus } = renderBackNavigation({
        initialEntry: '/add-data-instructions',
      });
      expect(result.current.back).toBeUndefined();

      updateStatus(makeStatus({ has_data: true }));

      expect(result.current.back).toEqual(pluginRootTarget);
    });

    it('query params on the URL do not affect the pathname === check', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/add-data-instructions?selectedTab=kubernetes',
        initialStatus: makeStatus({ has_data: false }),
      });
      expect(result.current.back).toBeUndefined();
    });

    it('does not apply the guard to the other back-button routes', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/settings',
        initialStatus: makeStatus({ has_data: false }),
      });
      expect(result.current.back).toEqual(pluginRootTarget);
    });
  });
});
