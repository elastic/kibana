/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { TrialCompanion } from './trial_companion';
import { useKibana } from '../common/lib/kibana';
import { useGetNBA } from './hooks/use_get_nba';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { Milestone } from '../../common/trial_companion/types';
import {
  GET_SET_UP_ACCORDION_TEST_ID,
  GET_SET_UP_DISMISS_BUTTON_TEST_ID,
  TEST_SUBJ_PREFIX,
} from './nba_get_setup_panel';
import { NBA_TODO_LIST } from './nba_translations';
import { TestProviders } from '../common/mock';
import userEvent from '@testing-library/user-event';
import { postNBADismiss } from './api';

jest.mock('../common/lib/kibana');
jest.mock('./hooks/use_get_nba');
jest.mock('../common/hooks/use_experimental_features');
jest.mock('./api', () => ({
  postNBADismiss: jest.fn(),
}));

interface NBAResponse {
  value?: { openTODOs?: Milestone[]; dismiss?: boolean } | undefined;
  error: Error | undefined;
  loading: boolean;
}

// Mock useInterval to capture the callback
let intervalCallback: (() => void) | null = null;
jest.mock('react-use/lib/useInterval', () => {
  return jest.fn((callback: () => void) => {
    intervalCallback = callback;
  });
});

const mockUseKibana = useKibana as jest.Mock;
const mockUseGetNBA = useGetNBA as jest.Mock;
const mockPostNBADismiss = postNBADismiss as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;

describe('TrialCompanion', () => {
  const defaultMockServices = {
    cloud: {
      isInTrial: jest.fn().mockReturnValue(true),
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

  describe('should not show Get set up panel', () => {
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
      nbaResponse: NBAResponse;
    }>([
      {
        scenario: 'not in trial',
        isInTrial: false,
        featureEnabled: true,
        nbaResponse: { value: { openTODOs: [Milestone.M1] }, error: undefined, loading: false },
      },
      {
        scenario: 'trial companion feature is disabled',
        isInTrial: true,
        featureEnabled: false,
        nbaResponse: { value: { openTODOs: [Milestone.M1] }, error: undefined, loading: false },
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
      {
        scenario: 'dismiss',
        isInTrial: true,
        featureEnabled: true,
        nbaResponse: {
          value: { openTODOs: [Milestone.M1], dismiss: true },
          error: undefined,
          loading: false,
        },
      },
    ])('when $scenario', async ({ isInTrial, featureEnabled, nbaResponse }) => {
      mockUseKibana.mockReturnValue({
        services: isInTrial ? defaultMockServices : notInTrialServices,
      });
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(featureEnabled);
      mockUseGetNBA.mockReturnValue(nbaResponse);

      const { queryByTestId } = render(<TrialCompanion />);

      await waitFor(() => {
        expect(queryByTestId(GET_SET_UP_ACCORDION_TEST_ID)).toBeNull();
      });
    });
  });

  describe('get setup panel rendering and updates', () => {
    const todoList = NBA_TODO_LIST;
    const buildResult = (milestoneIds: Milestone[]) => {
      return todoList.map((i) => i.milestoneId).filter((mId) => !milestoneIds.includes(mId));
    };

    it.each<{
      scenario: string;
      firstResponse: NBAResponse;
      secondResponse: NBAResponse | undefined;
      expectedFirstRender: Milestone[];
      expectedSecondRender: Milestone[] | undefined;
    }>([
      {
        scenario:
          'should show banner when a valid list is returned and use previous result when no result after',
        firstResponse: { value: { openTODOs: [Milestone.M1] }, error: undefined, loading: false },
        secondResponse: { error: undefined, loading: false },
        expectedFirstRender: buildResult([Milestone.M1]),
        expectedSecondRender: buildResult([Milestone.M1]),
      },
      {
        scenario: 'should re-render component when useInterval triggers and items changes',
        firstResponse: {
          value: { openTODOs: [Milestone.M1, Milestone.M3, Milestone.M5] },
          error: undefined,
          loading: false,
        },
        secondResponse: {
          value: { openTODOs: [Milestone.M1, Milestone.M3] },
          error: undefined,
          loading: false,
        },
        expectedFirstRender: buildResult([Milestone.M1, Milestone.M3, Milestone.M5]),
        expectedSecondRender: buildResult([Milestone.M1, Milestone.M3]),
      },
      {
        scenario: 'should hide banner if dismissed',
        firstResponse: { value: { openTODOs: [Milestone.M1] }, error: undefined, loading: false },
        secondResponse: {
          value: { openTODOs: [Milestone.M1], dismiss: true },
          error: undefined,
          loading: false,
        },
        expectedFirstRender: buildResult([Milestone.M1]),
        expectedSecondRender: undefined,
      },
    ])(
      '$scenario',
      async ({ firstResponse, secondResponse, expectedFirstRender, expectedSecondRender }) => {
        mockUseGetNBA.mockReturnValue(firstResponse);

        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <TrialCompanion />
          </TestProviders>
        );

        await waitFor(() => {
          expect(getByTestId(GET_SET_UP_ACCORDION_TEST_ID)).toBeInTheDocument();
          expect(queryByTestId(GET_SET_UP_DISMISS_BUTTON_TEST_ID)).toBeNull();
        });

        todoList
          .map((i) => i.milestoneId)
          .forEach((mId) => {
            expect(getByTestId(`${TEST_SUBJ_PREFIX}-item-${mId}`)).toBeInTheDocument();
          });

        expectedFirstRender.forEach((milestoneId) => {
          const icon = getByTestId(`${TEST_SUBJ_PREFIX}-item-icon-${milestoneId}`);
          expect(icon).toHaveAttribute('data-euiicon-type', 'checkInCircleFilled');
        });

        mockUseGetNBA.mockReturnValue(secondResponse);

        await act(async () => {
          if (intervalCallback) {
            intervalCallback();
          }
        });

        if (expectedSecondRender) {
          await waitFor(() => {
            expect(getByTestId(GET_SET_UP_ACCORDION_TEST_ID)).toBeInTheDocument();
            todoList
              .map((i) => i.milestoneId)
              .forEach((mId) => {
                expect(getByTestId(`${TEST_SUBJ_PREFIX}-item-${mId}`)).toBeInTheDocument();
              });

            expectedSecondRender.forEach((milestoneId) => {
              const icon = getByTestId(`${TEST_SUBJ_PREFIX}-item-icon-${milestoneId}`);
              expect(icon).toHaveAttribute('data-euiicon-type', 'checkInCircleFilled');
            });
          });
        } else {
          await waitFor(() => {
            expect(queryByTestId(GET_SET_UP_ACCORDION_TEST_ID)).toBeNull();
          });
        }
      }
    );
  });

  describe('dismiss button', () => {
    it('should be when all items are done and hide the pannel', async () => {
      mockUseGetNBA.mockReturnValue({
        value: { openTODOs: [] },
        error: undefined,
        loading: false,
      });

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <TrialCompanion />
        </TestProviders>
      );
      await waitFor(() => {
        expect(getByTestId(GET_SET_UP_ACCORDION_TEST_ID)).toBeInTheDocument();
        expect(getByTestId(GET_SET_UP_DISMISS_BUTTON_TEST_ID)).toBeInTheDocument();
      });
      await userEvent.click(getByTestId(GET_SET_UP_DISMISS_BUTTON_TEST_ID));

      expect(mockPostNBADismiss).toHaveBeenCalled();

      expect(queryByTestId(GET_SET_UP_ACCORDION_TEST_ID)).toBeNull();
    });
  });
});
