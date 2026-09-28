/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../utils/kibana_react';
import { APM_APP_LOCATOR_ID } from '../../components/alert_sources/get_apm_app_url';
import { LandingPage } from './landing';

jest.mock('../../hooks/use_has_data');
jest.mock('../../utils/kibana_react');

const useHasDataMock = useHasData as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;

const setup = ({ hasCompleteLandingPage }: { hasCompleteLandingPage: boolean }) => {
  const navigate = { logs: jest.fn(), apm: jest.fn(), onboarding: jest.fn() };
  const locators = {
    [LOGS_LOCATOR_ID]: { navigate: navigate.logs },
    [APM_APP_LOCATOR_ID]: { navigate: navigate.apm },
    [OBSERVABILITY_ONBOARDING_LOCATOR]: { navigate: navigate.onboarding },
  };

  let resolveStatus: (status: { hasData: boolean }) => void;
  const getStatus = jest.fn(
    () =>
      new Promise<{ hasData: boolean }>((resolve) => {
        resolveStatus = resolve;
      })
  );

  useHasDataMock.mockReturnValue({ hasDataMap: {}, isAllRequestsComplete: true });
  useKibanaMock.mockReturnValue({
    services: {
      pricing: { isFeatureAvailable: () => hasCompleteLandingPage },
      share: { url: { locators: { get: (id: keyof typeof locators) => locators[id] } } },
      logsDataAccess: { services: { logDataService: { getStatus } } },
    },
  });

  return {
    navigate,
    resolveStatus: async (status: { hasData: boolean }) => {
      await act(async () => {
        resolveStatus(status);
      });
    },
  };
};

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    ['complete', true],
    ['logs essentials', false],
  ])('%s tier', (_tier, hasCompleteLandingPage) => {
    it('redirects to logs once the logs data check resolves', async () => {
      const { navigate, resolveStatus } = setup({ hasCompleteLandingPage });
      render(<LandingPage />);

      await resolveStatus({ hasData: true });

      expect(navigate.logs).toHaveBeenCalledTimes(1);
      expect(navigate.onboarding).not.toHaveBeenCalled();
    });

    it('redirects to onboarding when there is no data', async () => {
      const { navigate, resolveStatus } = setup({ hasCompleteLandingPage });
      render(<LandingPage />);

      await resolveStatus({ hasData: false });

      expect(navigate.onboarding).toHaveBeenCalledTimes(1);
      expect(navigate.logs).not.toHaveBeenCalled();
    });

    it('does not redirect when it unmounts before the logs data check resolves', async () => {
      const { navigate, resolveStatus } = setup({ hasCompleteLandingPage });
      const { unmount } = render(<LandingPage />);

      unmount();
      await resolveStatus({ hasData: false });

      expect(navigate.onboarding).not.toHaveBeenCalled();
      expect(navigate.logs).not.toHaveBeenCalled();
      expect(navigate.apm).not.toHaveBeenCalled();
    });
  });
});
