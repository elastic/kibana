/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { NIGHTSHIFT_UI_PRIVILEGES, type NightshiftSource } from '@kbn/nightshift-shared';
import { useSignificantEventsAvailability } from '../data/availability/use_significant_events_availability';
import { useFetchSources } from '../data/sources/use_fetch_sources';
import { useKibana } from '../hooks/use_kibana';
import { useDetectionSetupBanner } from './use_detection_setup_banner';

jest.mock('../data/availability/use_significant_events_availability');
jest.mock('../data/sources/use_fetch_sources');
jest.mock('../hooks/use_kibana');

const mockUseSignificantEventsAvailability = useSignificantEventsAvailability as jest.Mock;
const mockUseFetchSources = useFetchSources as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

interface TestCase {
  name: string;
  suppressed?: boolean;
  canManage?: boolean;
  isAvailable?: boolean;
  sources?: NightshiftSource[];
  isSourcesLoading?: boolean;
  dismissed?: boolean;
  expected: boolean;
}

interface MockDependencies {
  canManage?: boolean;
  isAvailable?: boolean;
  sources?: NightshiftSource[];
  isSourcesLoading?: boolean;
  basePath?: string;
}

const mockDependencies = ({
  canManage = true,
  isAvailable = true,
  sources = [],
  isSourcesLoading = false,
  basePath = '/s/team-a',
}: MockDependencies = {}) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          nightshift: {
            [NIGHTSHIFT_UI_PRIVILEGES.show]: true,
            [NIGHTSHIFT_UI_PRIVILEGES.manage]: canManage,
          },
        },
      },
      http: { basePath: { get: () => basePath } },
    },
  });
  mockUseSignificantEventsAvailability.mockReturnValue({
    isAvailable,
    isLoading: false,
  });
  mockUseFetchSources.mockImplementation(
    ({ select }: { select?: (sourceList: NightshiftSource[]) => unknown } = {}) => ({
      data: select ? select(sources) : sources,
      isError: false,
      isLoading: isSourcesLoading,
    })
  );
};

const createSource = (enabled: boolean): NightshiftSource => ({
  id: enabled ? 'enabled-source' : 'disabled-source',
  title: enabled ? 'Enabled source' : 'Disabled source',
  tags: [],
  esql: 'FROM logs-*',
  type: 'logs',
  slug: enabled ? 'enabled-source' : 'disabled-source',
  view_name: enabled ? '$.nightshift.sources.enabled' : '$.nightshift.sources.disabled',
  enabled,
  created_by: 'test-user',
  created_at: '2026-11-03T00:00:00.000Z',
  updated_at: '2026-11-03T00:00:00.000Z',
  esql_updated_at: '2026-11-03T00:00:00.000Z',
});

const cases: TestCase[] = [
  { name: 'shows when every condition is met', expected: true },
  { name: 'hides when suppressed', suppressed: true, expected: false },
  { name: 'hides without manage privileges', canManage: false, expected: false },
  { name: 'hides when Significant Events is unavailable', isAvailable: false, expected: false },
  { name: 'hides when an enabled source exists', sources: [createSource(true)], expected: false },
  { name: 'hides when a disabled source exists', sources: [createSource(false)], expected: false },
  { name: 'hides while sources load', isSourcesLoading: true, expected: false },
  { name: 'hides after dismissal', dismissed: true, expected: false },
];

describe('useDetectionSetupBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each(cases)('$name', (testCase) => {
    const {
      suppressed = false,
      canManage = true,
      isAvailable = true,
      sources = [],
      isSourcesLoading = false,
      dismissed = false,
      expected,
    } = testCase;

    mockDependencies({
      canManage,
      isAvailable,
      sources,
      isSourcesLoading,
    });
    if (dismissed) {
      window.localStorage.setItem('nightshift.detectionSetupBanner.dismissed:/s/team-a', 'true');
    }

    const { result } = renderHook(() => useDetectionSetupBanner({ suppressed }));

    expect(result.current.isVisible).toBe(expected);
  });

  it('persists dismissal within a space without dismissing the banner in other spaces', () => {
    mockDependencies({ basePath: '/s/team-a' });
    const firstMount = renderHook(() => useDetectionSetupBanner({ suppressed: false }));

    expect(firstMount.result.current.isVisible).toBe(true);
    act(() => firstMount.result.current.dismiss());
    expect(firstMount.result.current.isVisible).toBe(false);
    firstMount.unmount();

    const sameSpace = renderHook(() => useDetectionSetupBanner({ suppressed: false }));
    expect(sameSpace.result.current.isVisible).toBe(false);
    sameSpace.unmount();

    mockDependencies({ basePath: '/s/team-b' });
    const otherSpace = renderHook(() => useDetectionSetupBanner({ suppressed: false }));
    expect(otherSpace.result.current.isVisible).toBe(true);
  });
});
