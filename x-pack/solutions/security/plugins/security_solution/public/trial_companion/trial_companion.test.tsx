/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { TrialCompanion } from './trial_companion';
import { useKibana } from '../common/lib/kibana';
import { useGetNBA } from './hooks/use_get_nba';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { Milestone } from '../../common/trial_companion/types';

jest.mock('../common/lib/kibana');
jest.mock('./hooks/use_get_nba');
jest.mock('../common/hooks/use_experimental_features');
jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(() => jest.fn()),
}));
jest.mock('./api', () => ({
  postNBAUserSeen: jest.fn(),
}));

// Mock useInterval to capture the callback
let intervalCallback: (() => void) | null = null;
jest.mock('react-use/lib/useInterval', () => {
  return jest.fn((callback: () => void) => {
    intervalCallback = callback;
  });
});

const mockUseKibana = useKibana as jest.Mock;
const mockUseGetNBA = useGetNBA as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;

describe('TrialCompanion', () => {
  const mockBannersReplace = jest.fn().mockReturnValue('mock-banner-id');
  const mockBannersRemove = jest.fn();
  const mockNavigateToApp = jest.fn();

  const defaultMockServices = {
    cloud: {
      isInTrial: jest.fn().mockReturnValue(true),
    },
    overlays: {
      banners: {
        replace: mockBannersReplace,
        remove: mockBannersRemove,
      },
    },
    application: {
      navigateToApp: mockNavigateToApp,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    intervalCallback = null;

    mockUseKibana.mockReturnValue({
      services: defaultMockServices,
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
  });

  describe('should not show banner', () => {
    const notInTrialServices = {
      ...defaultMockServices,
      cloud: {
        isInTrial: jest.fn().mockReturnValue(false),
      },
    };

    it.each<{
      scenario: string;
      isInTrial: boolean;
      featureEnabled: boolean;
      nbaResponse: {
        value: { milestoneId?: Milestone } | undefined;
        error: Error | undefined;
        loading: boolean;
      };
    }>([
      {
        scenario: 'not in trial',
        isInTrial: false,
        featureEnabled: true,
        nbaResponse: { value: { milestoneId: Milestone.M1 }, error: undefined, loading: false },
      },
      {
        scenario: 'trial companion feature is disabled',
        isInTrial: true,
        featureEnabled: false,
        nbaResponse: { value: { milestoneId: Milestone.M1 }, error: undefined, loading: false },
      },
      {
        scenario: 'useGetNBA is loading',
        isInTrial: true,
        featureEnabled: true,
        nbaResponse: { value: undefined, error: undefined, loading: true },
      },
      {
        scenario: 'useGetNBA returns an error',
        isInTrial: true,
        featureEnabled: true,
        nbaResponse: { value: undefined, error: new Error('Failed to fetch NBA'), loading: false },
      },
    ])('when $scenario', async ({ isInTrial, featureEnabled, nbaResponse }) => {
      mockUseKibana.mockReturnValue({
        services: isInTrial ? defaultMockServices : notInTrialServices,
      });
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(featureEnabled);
      mockUseGetNBA.mockReturnValue(nbaResponse);

      render(<TrialCompanion />);

      await waitFor(() => {
        expect(mockBannersReplace).not.toHaveBeenCalled();
      });
    });
  });

  interface NBAResponse {
    value: { milestoneId?: Milestone } | undefined;
    error: Error | undefined;
    loading: boolean;
  }

  describe('banner rendering and updates', () => {
    it.each<{
      scenario: string;
      firstResponse: NBAResponse;
      secondResponse: NBAResponse | undefined;
      expectedReplaceCalls: number;
      expectedRemoveCalls: number;
    }>([
      {
        scenario: 'should show banner when a valid milestone is returned',
        firstResponse: { value: { milestoneId: Milestone.M1 }, error: undefined, loading: false },
        secondResponse: undefined,
        expectedReplaceCalls: 1,
        expectedRemoveCalls: 0,
      },
      {
        scenario: 'should re-render component when useInterval triggers and milestone changes',
        firstResponse: { value: { milestoneId: Milestone.M1 }, error: undefined, loading: false },
        secondResponse: { value: { milestoneId: Milestone.M2 }, error: undefined, loading: false },
        expectedReplaceCalls: 2,
        expectedRemoveCalls: 0,
      },
      {
        scenario: 'should not re-render banner when the same milestone is returned',
        firstResponse: { value: { milestoneId: Milestone.M3 }, error: undefined, loading: false },
        secondResponse: { value: { milestoneId: Milestone.M3 }, error: undefined, loading: false },
        expectedReplaceCalls: 1,
        expectedRemoveCalls: 0,
      },
      {
        scenario: 'should remove banner when milestoneId becomes undefined',
        firstResponse: { value: { milestoneId: Milestone.M1 }, error: undefined, loading: false },
        secondResponse: { value: { milestoneId: undefined }, error: undefined, loading: false },
        expectedReplaceCalls: 1,
        expectedRemoveCalls: 1,
      },
    ])(
      '$scenario',
      async ({ firstResponse, secondResponse, expectedReplaceCalls, expectedRemoveCalls }) => {
        mockUseGetNBA.mockReturnValue(firstResponse);

        const { rerender } = render(<TrialCompanion />);

        await waitFor(() => {
          expect(mockBannersReplace).toHaveBeenCalled();
        });

        if (secondResponse) {
          mockUseGetNBA.mockReturnValue(secondResponse);

          await act(async () => {
            if (intervalCallback) {
              intervalCallback();
            }
          });

          rerender(<TrialCompanion />);
        }

        await waitFor(() => {
          expect(mockBannersReplace).toHaveBeenCalledTimes(expectedReplaceCalls);
          expect(mockBannersRemove).toHaveBeenCalledTimes(expectedRemoveCalls);

          if (expectedRemoveCalls > 0) {
            expect(mockBannersRemove).toHaveBeenCalledWith('mock-banner-id');
          }
        });
      }
    );
  });

  describe('banner removal on unmount', () => {
    it('should remove banner when component unmounts', async () => {
      mockUseGetNBA.mockReturnValue({
        value: { milestoneId: Milestone.M1 },
        error: undefined,
        loading: false,
      });

      const { unmount } = render(<TrialCompanion />);

      await waitFor(() => {
        expect(mockBannersReplace).toHaveBeenCalledTimes(1);
      });

      unmount();

      expect(mockBannersRemove).toHaveBeenCalledWith('mock-banner-id');
    });
  });
});
