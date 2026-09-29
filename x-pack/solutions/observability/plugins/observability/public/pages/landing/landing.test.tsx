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
import type { HasDataContextValue } from '../../context/has_data_context/has_data_context';
import { APM_APP_LOCATOR_ID } from '../../components/alert_sources/get_apm_app_url';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../utils/kibana_react';
import { LandingPage } from './landing';

jest.mock('../../hooks/use_has_data', () => ({ useHasData: jest.fn() }));
jest.mock('../../utils/kibana_react', () => ({ useKibana: jest.fn() }));

const useHasDataMock = useHasData as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;

describe('LandingPage', () => {
  const locators = {
    [APM_APP_LOCATOR_ID]: { navigate: jest.fn() },
    [LOGS_LOCATOR_ID]: { navigate: jest.fn() },
    [OBSERVABILITY_ONBOARDING_LOCATOR]: { navigate: jest.fn() },
  };
  let resolveLogsStatus: (status: { hasData: boolean }) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    useHasDataMock.mockReturnValue({
      hasDataMap: {},
      isAllRequestsComplete: true,
    } as HasDataContextValue);

    useKibanaMock.mockReturnValue({
      services: {
        pricing: { isFeatureAvailable: () => true },
        share: { url: { locators: { get: (id: string) => locators[id] } } },
        logsDataAccess: {
          services: {
            logDataService: {
              getStatus: () =>
                new Promise((resolve) => {
                  resolveLogsStatus = resolve;
                }),
            },
          },
        },
      },
    });
  });

  it('redirects to onboarding when there is no data', async () => {
    render(<LandingPage />);

    await act(async () => {
      resolveLogsStatus({ hasData: false });
    });

    expect(locators[OBSERVABILITY_ONBOARDING_LOCATOR].navigate).toHaveBeenCalled();
  });

  it('does not redirect once the landing page has unmounted', async () => {
    const { unmount } = render(<LandingPage />);

    unmount();

    await act(async () => {
      resolveLogsStatus({ hasData: false });
    });

    expect(locators[OBSERVABILITY_ONBOARDING_LOCATOR].navigate).not.toHaveBeenCalled();
    expect(locators[LOGS_LOCATOR_ID].navigate).not.toHaveBeenCalled();
    expect(locators[APM_APP_LOCATOR_ID].navigate).not.toHaveBeenCalled();
  });
});
