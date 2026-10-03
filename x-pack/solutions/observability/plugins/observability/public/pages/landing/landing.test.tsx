/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useKibana } from '../../utils/kibana_react';
import { useHasData } from '../../hooks/use_has_data';
import { LandingPage } from './landing';

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_has_data');

const useKibanaMock = useKibana as jest.Mock;
const useHasDataMock = useHasData as jest.Mock;

describe('LandingPage', () => {
  let navigate: jest.Mock;
  let resolveLogsStatus: (status: { hasData: boolean }) => void;

  const mockServices = ({ hasCompleteLandingPage }: { hasCompleteLandingPage: boolean }) => {
    navigate = jest.fn();
    const logsStatus = new Promise<{ hasData: boolean }>((resolve) => {
      resolveLogsStatus = resolve;
    });

    useKibanaMock.mockReturnValue({
      services: {
        pricing: { isFeatureAvailable: () => hasCompleteLandingPage },
        share: { url: { locators: { get: () => ({ navigate }) } } },
        logsDataAccess: {
          services: { logDataService: { getStatus: () => logsStatus } },
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useHasDataMock.mockReturnValue({ hasDataMap: {}, isAllRequestsComplete: true });
  });

  describe.each([
    ['complete tier', true],
    ['logs essentials tier', false],
  ])('%s', (_name, hasCompleteLandingPage) => {
    it('redirects once the logs data probe settles', async () => {
      mockServices({ hasCompleteLandingPage });
      render(<LandingPage />);

      resolveLogsStatus({ hasData: true });

      await waitFor(() => expect(navigate).toHaveBeenCalled());
    });

    it('does not redirect when the probe settles after the user navigated away', async () => {
      mockServices({ hasCompleteLandingPage });
      const { unmount } = render(<LandingPage />);

      unmount();
      resolveLogsStatus({ hasData: true });
      await logsStatusFlushed();

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

// Lets the resolved getStatus promise run its continuations so a missing unmount guard would have
// navigated by the time we assert.
const logsStatusFlushed = () => new Promise((resolve) => setTimeout(resolve, 0));
