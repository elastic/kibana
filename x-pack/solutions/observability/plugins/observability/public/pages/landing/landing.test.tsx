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

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_has_data');

const useKibanaMock = useKibana as jest.Mock;
const useHasDataMock = useHasData as jest.Mock;

describe('LandingPage', () => {
  const navigate = {
    [LOGS_LOCATOR_ID]: jest.fn(),
    [APM_APP_LOCATOR_ID]: jest.fn(),
    [OBSERVABILITY_ONBOARDING_LOCATOR]: jest.fn(),
  };

  // resolves `getStatus` on demand so the test controls when the redirect effect continues
  let resolveHasLogsData: (hasData: boolean) => void;

  const setup = ({ hasCompleteLandingPage }: { hasCompleteLandingPage: boolean }) => {
    useKibanaMock.mockReturnValue({
      services: {
        pricing: { isFeatureAvailable: () => hasCompleteLandingPage },
        share: { url: { locators: { get: (id: string) => ({ navigate: navigate[id] }) } } },
        logsDataAccess: {
          services: {
            logDataService: {
              getStatus: () =>
                new Promise((resolve) => {
                  resolveHasLogsData = (hasData) => resolve({ hasData });
                }),
            },
          },
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useHasDataMock.mockReturnValue({ hasDataMap: {}, isAllRequestsComplete: true });
  });

  describe.each([
    ['complete', true],
    ['logs essentials', false],
  ])('%s landing page', (_name, hasCompleteLandingPage) => {
    it('redirects to onboarding when there is no observability data', async () => {
      setup({ hasCompleteLandingPage });
      render(<LandingPage />);

      await act(async () => resolveHasLogsData(false));

      expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).toHaveBeenCalledTimes(1);
    });

    it('does not redirect once the route has changed', async () => {
      setup({ hasCompleteLandingPage });
      const { unmount } = render(<LandingPage />);

      unmount();
      await act(async () => resolveHasLogsData(false));

      expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).not.toHaveBeenCalled();
    });
  });

  it('redirects to logs when logs data exists', async () => {
    setup({ hasCompleteLandingPage: true });
    render(<LandingPage />);

    await act(async () => resolveHasLogsData(true));

    expect(navigate[LOGS_LOCATOR_ID]).toHaveBeenCalledTimes(1);
    expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).not.toHaveBeenCalled();
  });

  it('redirects to APM when only APM data exists', async () => {
    useHasDataMock.mockReturnValue({
      hasDataMap: { apm: { hasData: true } },
      isAllRequestsComplete: true,
    });
    setup({ hasCompleteLandingPage: true });
    render(<LandingPage />);

    await act(async () => resolveHasLogsData(false));

    expect(navigate[APM_APP_LOCATOR_ID]).toHaveBeenCalledTimes(1);
    expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).not.toHaveBeenCalled();
  });

  it('does not redirect while the complete landing page has requests in flight', async () => {
    useHasDataMock.mockReturnValue({ hasDataMap: {}, isAllRequestsComplete: false });
    setup({ hasCompleteLandingPage: true });
    render(<LandingPage />);

    await act(async () => {});

    expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).not.toHaveBeenCalled();
    expect(navigate[LOGS_LOCATOR_ID]).not.toHaveBeenCalled();
  });
});
