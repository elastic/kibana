/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { LandingPage } from './landing';
import { useKibana } from '../../utils/kibana_react';
import { useHasData } from '../../hooks/use_has_data';

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_has_data');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useHasDataMock = useHasData as jest.MockedFunction<typeof useHasData>;

describe('LandingPage', () => {
  const logsLocator = { navigate: jest.fn() };
  const onboardingLocator = { navigate: jest.fn() };
  let getStatus: jest.Mock;

  const setup = ({ hasCompleteLandingPage }: { hasCompleteLandingPage: boolean }) => {
    useKibanaMock.mockReturnValue({
      services: {
        pricing: { isFeatureAvailable: () => hasCompleteLandingPage },
        share: {
          url: {
            locators: {
              get: (id: string) => {
                if (id === LOGS_LOCATOR_ID) return logsLocator;
                if (id === OBSERVABILITY_ONBOARDING_LOCATOR) return onboardingLocator;
              },
            },
          },
        },
        logsDataAccess: { services: { logDataService: { getStatus } } },
      },
    } as unknown as ReturnType<typeof useKibana>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getStatus = jest.fn().mockResolvedValue({ hasData: false });
    useHasDataMock.mockReturnValue({ hasDataMap: {}, isAllRequestsComplete: true } as ReturnType<
      typeof useHasData
    >);
  });

  it.each([
    ['complete', true],
    ['logs essentials', false],
  ])(
    'redirects to onboarding when there is no data (%s tier)',
    async (_, hasCompleteLandingPage) => {
      setup({ hasCompleteLandingPage });

      render(<LandingPage />);

      await waitFor(() => expect(onboardingLocator.navigate).toHaveBeenCalledWith({}));
    }
  );

  it.each([
    ['complete', true],
    ['logs essentials', false],
  ])('does not redirect once it has unmounted (%s tier)', async (_, hasCompleteLandingPage) => {
    let resolveStatus: (status: { hasData: boolean }) => void;
    getStatus.mockReturnValue(
      new Promise<{ hasData: boolean }>((resolve) => {
        resolveStatus = resolve;
      })
    );
    setup({ hasCompleteLandingPage });

    const { unmount } = render(<LandingPage />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());

    unmount();
    resolveStatus!({ hasData: true });
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(1));

    expect(logsLocator.navigate).not.toHaveBeenCalled();
    expect(onboardingLocator.navigate).not.toHaveBeenCalled();
  });
});
