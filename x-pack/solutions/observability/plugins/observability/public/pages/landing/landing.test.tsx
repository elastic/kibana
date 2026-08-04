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
import * as dataContext from '../../hooks/use_has_data';
import * as kibanaContext from '../../utils/kibana_react';
import { APM_APP_LOCATOR_ID } from '../../components/alert_sources/get_apm_app_url';
import { LandingPage } from './landing';

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_has_data');

const navigate = {
  [APM_APP_LOCATOR_ID]: jest.fn(),
  [LOGS_LOCATOR_ID]: jest.fn(),
  [OBSERVABILITY_ONBOARDING_LOCATOR]: jest.fn(),
};

const getStatus = jest.fn();
const isFeatureAvailable = jest.fn();

const setup = ({ hasLogs, hasApm }: { hasLogs: boolean; hasApm: boolean }) => {
  isFeatureAvailable.mockReturnValue(true);
  getStatus.mockResolvedValue({ hasData: hasLogs });

  (kibanaContext.useKibana as jest.Mock).mockReturnValue({
    services: {
      pricing: { isFeatureAvailable },
      share: {
        url: { locators: { get: (id: string) => ({ navigate: navigate[id] }) } },
      },
      logsDataAccess: { services: { logDataService: { getStatus } } },
    },
  });

  (dataContext.useHasData as jest.Mock).mockReturnValue({
    hasDataMap: { apm: { hasData: hasApm } },
    isAllRequestsComplete: true,
    hasAnyData: hasLogs || hasApm,
    onRefreshTimeRange: jest.fn(),
    forceUpdate: '',
  });
};

describe('LandingPage redirect precedence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to logs when logs data exists (logs > apm)', async () => {
    setup({ hasLogs: true, hasApm: true });

    render(<LandingPage />);

    await waitFor(() => expect(navigate[LOGS_LOCATOR_ID]).toHaveBeenCalledTimes(1));
    expect(navigate[APM_APP_LOCATOR_ID]).not.toHaveBeenCalled();
    expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).not.toHaveBeenCalled();
  });

  it('redirects to apm when only apm data exists', async () => {
    setup({ hasLogs: false, hasApm: true });

    render(<LandingPage />);

    await waitFor(() => expect(navigate[APM_APP_LOCATOR_ID]).toHaveBeenCalledTimes(1));
    expect(navigate[LOGS_LOCATOR_ID]).not.toHaveBeenCalled();
    expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).not.toHaveBeenCalled();
  });

  it('redirects to onboarding when no data exists', async () => {
    setup({ hasLogs: false, hasApm: false });

    render(<LandingPage />);

    await waitFor(() =>
      expect(navigate[OBSERVABILITY_ONBOARDING_LOCATOR]).toHaveBeenCalledTimes(1)
    );
    expect(navigate[LOGS_LOCATOR_ID]).not.toHaveBeenCalled();
    expect(navigate[APM_APP_LOCATOR_ID]).not.toHaveBeenCalled();
  });
});
