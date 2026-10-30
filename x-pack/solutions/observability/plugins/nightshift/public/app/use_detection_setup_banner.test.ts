/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
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
  sourcesCount?: number;
  isSourcesLoading?: boolean;
  dismissed?: boolean;
  expected: boolean;
}

const cases: TestCase[] = [
  { name: 'shows when every condition is met', expected: true },
  { name: 'hides when suppressed', suppressed: true, expected: false },
  { name: 'hides without manage privileges', canManage: false, expected: false },
  { name: 'hides when Significant Events is unavailable', isAvailable: false, expected: false },
  { name: 'hides when a source exists', sourcesCount: 1, expected: false },
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
      sourcesCount = 0,
      isSourcesLoading = false,
      dismissed = false,
      expected,
    } = testCase;

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
        http: { basePath: { get: () => '/s/team-a' } },
      },
    });
    mockUseSignificantEventsAvailability.mockReturnValue({
      isAvailable,
      isLoading: false,
    });
    mockUseFetchSources.mockReturnValue({
      data: sourcesCount,
      isError: false,
      isLoading: isSourcesLoading,
    });
    if (dismissed) {
      window.localStorage.setItem('nightshift.detectionSetupBanner.dismissed:/s/team-a', 'true');
    }

    const { result } = renderHook(() => useDetectionSetupBanner({ suppressed }));

    expect(result.current.isVisible).toBe(expected);
  });
});
