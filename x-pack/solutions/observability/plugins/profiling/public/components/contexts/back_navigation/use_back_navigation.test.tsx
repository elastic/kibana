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
  BackNavigationContextProvider,
  hasBackNavigation,
  isExcludedFromBackTarget,
  ROUTES_EXCLUDED_FROM_BACK_TARGET,
  ROUTES_WITH_BACK_NAVIGATION,
} from './back_navigation_context';
import { useBackNavigation } from './use_back_navigation';

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

// Build a valid ProfilingSetupStatus, overriding only what each test case needs.
const makeStatus = (overrides: Partial<ProfilingSetupStatus>): ProfilingSetupStatus => ({
  type: 'cloud',
  has_setup: true,
  has_data: true,
  pre_8_9_1_data: false,
  has_required_role: true,
  ...overrides,
});

// Renders useBackNavigation inside the full provider tree. Returns the RTL result plus a `renders`
// log (every hook return value across all renders) and `updateStatus` to drive status changes
// post-mount without remounting the provider (which would destroy lastVisitedRoute).
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
            {/*
             * BackNavigationContextProvider requires React.ReactElement; RTL's wrapper passes
             * React.ReactNode. The fragment satisfies the type without a cast or ts-expect-error.
             */}
            <BackNavigationContextProvider>
              <>{children}</>
            </BackNavigationContextProvider>
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

  it.each(['/stacktraces/threads', '/flamegraphs/flamegraph', '/'])(
    'returns false for %s',
    (route) => {
      expect(hasBackNavigation(route)).toBe(false);
    }
  );
});

describe('isExcludedFromBackTarget', () => {
  it.each(ROUTES_EXCLUDED_FROM_BACK_TARGET)('returns true for %s', (route) => {
    expect(isExcludedFromBackTarget(route)).toBe(true);
  });

  it.each(ROUTES_WITH_BACK_NAVIGATION)(
    'returns false for the back-button route %s — the two lists are disjoint',
    (route) => {
      expect(isExcludedFromBackTarget(route)).toBe(false);
    }
  );

  it.each(['/stacktraces/threads', '/flamegraphs/flamegraph', '/'])(
    'returns false for the content route %s',
    (route) => {
      expect(isExcludedFromBackTarget(route)).toBe(false);
    }
  );
});

describe('useBackNavigation', () => {
  describe('content routes — no back button', () => {
    it.each(['/stacktraces/threads', '/flamegraphs/flamegraph', '/'])(
      'returns undefined on %s',
      (route) => {
        const { result } = renderBackNavigation({ initialEntry: route });
        expect(result.current.back).toBeUndefined();
      }
    );

    it('returns undefined even when the content route has a query string', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/flamegraphs/flamegraph?kuery=foo',
      });
      expect(result.current.back).toBeUndefined();
    });
  });

  describe('cold deep link — no content route recorded yet', () => {
    it.each(ROUTES_WITH_BACK_NAVIGATION)('returns the plugin fallback for %s', (route) => {
      const { result } = renderBackNavigation({
        initialEntry: route,
        // Provide resolved status so /add-data-instructions does not suppress the button.
        initialStatus: makeStatus({ has_data: true }),
      });
      expect(result.current.back).toBe('/base/app/profiling');
    });
  });

  describe('recorded content route', () => {
    it('points back to the last content route, preserving its query string', () => {
      const { result, renders } = renderBackNavigation({
        initialEntry: '/flamegraphs/flamegraph?kuery=foo&rangeFrom=now-15m',
      });

      const i = renders.length;
      act(() => {
        result.current.history.push('/settings');
      });

      const expected = '/base/app/profiling/flamegraphs/flamegraph?kuery=foo&rangeFrom=now-15m';
      // Two-part assertion: value is correct AND there was no intermediate flash.
      // A bare .not.toContain(fallback) would pass vacuously on an empty slice.
      expect(renders[i]).toBe(expected);
      expect(renders.slice(i)).toEqual([expected]);
    });

    it('navigating between back-target routes does not overwrite the recorded content route', () => {
      const { result } = renderBackNavigation({ initialEntry: '/functions/topn?x=1' });

      act(() => result.current.history.push('/settings'));
      act(() => result.current.history.push('/storage-explorer'));

      expect(result.current.back).toBe('/base/app/profiling/functions/topn?x=1');
    });

    it('most-recent content route wins', () => {
      const { result } = renderBackNavigation({ initialEntry: '/stacktraces/threads' });

      act(() => result.current.history.push('/settings'));
      act(() => result.current.history.push('/flamegraphs/flamegraph?a=1'));
      act(() => result.current.history.push('/settings'));

      expect(result.current.back).toBe('/base/app/profiling/flamegraphs/flamegraph?a=1');
    });

    it('a search-only change is recorded as a distinct route', () => {
      const { result } = renderBackNavigation({ initialEntry: '/functions/topn?x=1' });

      act(() => result.current.history.replace('/functions/topn?x=2'));
      act(() => result.current.history.push('/settings'));

      expect(result.current.back).toBe('/base/app/profiling/functions/topn?x=2');
    });

    it('history.replace records the post-redirect URL (simulates RedirectWithDefaultDateRange)', () => {
      const { result } = renderBackNavigation({ initialEntry: '/functions/topn' });

      act(() =>
        result.current.history.replace('/functions/topn?rangeFrom=now-15m&rangeTo=now&kuery=')
      );
      act(() => result.current.history.push('/settings'));

      expect(result.current.back).toBe(
        '/base/app/profiling/functions/topn?rangeFrom=now-15m&rangeTo=now&kuery='
      );
    });

    it("records '/' and produces a trailing-slash href, distinct from the cold-deep-link fallback", () => {
      const { result, renders } = renderBackNavigation({ initialEntry: '/' });

      const i = renders.length;
      act(() => result.current.history.push('/settings'));

      // '/base/app/profiling/' (trailing slash) must not collapse to '/base/app/profiling'
      // (the cold-deep-link fallback).
      expect(renders[i]).toBe('/base/app/profiling/');
      expect(renders.slice(i)).toEqual(['/base/app/profiling/']);
    });
  });

  describe('excluded routes — never recorded as the back target', () => {
    it.each(ROUTES_EXCLUDED_FROM_BACK_TARGET)('returns undefined on %s', (route) => {
      const { result } = renderBackNavigation({
        initialEntry: route,
        // Provide resolved status so an undefined result cannot be attributed to a pending setup
        // fetch (which also suppresses the button on /add-data-instructions).
        initialStatus: makeStatus({ has_data: true }),
      });
      expect(result.current.back).toBeUndefined();
    });

    it.each(ROUTES_EXCLUDED_FROM_BACK_TARGET)(
      'records nothing on a cold deep link to %s, so /settings falls back to the plugin root',
      (route) => {
        // Pre-change this test fails: the back href would be e.g. /base/app/profiling/delete_data_instructions.
        const { result } = renderBackNavigation({ initialEntry: route });

        act(() => result.current.history.push('/settings'));

        expect(result.current.back).toBe('/base/app/profiling');
      }
    );

    it('does not overwrite the recorded content route', () => {
      const { result } = renderBackNavigation({ initialEntry: '/functions/topn?x=1' });

      act(() => result.current.history.push('/delete_data_instructions'));
      act(() => result.current.history.push('/profiling-not-enabled'));
      act(() => result.current.history.push('/settings'));

      expect(result.current.back).toBe('/base/app/profiling/functions/topn?x=1');
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
      const before = renders.length;

      updateStatus(makeStatus({ has_data: false }));

      expect(result.current.back).toBeUndefined();
      // Every render since mount must be undefined — no intermediate back value.
      expect(renders.slice(before).every((v) => v === undefined)).toBe(true);
    });

    it('returns a back href when has_data is true', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/add-data-instructions',
        initialStatus: makeStatus({ has_data: true }),
      });
      expect(result.current.back).toBe('/base/app/profiling');
    });

    it('transitions from undefined to a back href when has_data becomes true', () => {
      // A user with data who navigates from the menu to /add-data-instructions should see the
      // back button once the status fetch settles.
      const { result, updateStatus } = renderBackNavigation({
        initialEntry: '/add-data-instructions',
      });
      expect(result.current.back).toBeUndefined();

      updateStatus(makeStatus({ has_data: true }));

      expect(result.current.back).toBe('/base/app/profiling');
    });

    it('query params on the URL do not affect the pathname === check', () => {
      const { result } = renderBackNavigation({
        initialEntry: '/add-data-instructions?selectedTab=kubernetes',
        initialStatus: makeStatus({ has_data: false }),
      });
      expect(result.current.back).toBeUndefined();
    });
  });

  describe('missing context', () => {
    it('throws when BackNavigationContext is not provided', () => {
      expect(() => renderHook(() => useBackNavigation())).toThrow(
        'BackNavigationContext not found'
      );
    });
  });
});
