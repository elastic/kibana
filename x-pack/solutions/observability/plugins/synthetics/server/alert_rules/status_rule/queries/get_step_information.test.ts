/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepInformation } from './get_step_information';
import { getJourneyFailedSteps } from '../../../queries/get_journey_failed_steps';
import type { SyntheticsEsClient } from '../../../lib';

// Mock the getJourneyFailedSteps function
jest.mock('../../../queries/get_journey_failed_steps', () => ({
  getJourneyFailedSteps: jest.fn(),
}));

const mockGetJourneyFailedSteps = getJourneyFailedSteps as jest.MockedFunction<
  typeof getJourneyFailedSteps
>;

describe('getStepInformation', () => {
  const mockEsClient = {} as SyntheticsEsClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for non-browser monitor types', async () => {
    const result = await getStepInformation(mockEsClient, 'check-group-1', 'http');
    expect(result).toBeNull();
  });

  it('returns null for empty check group', async () => {
    const result = await getStepInformation(mockEsClient, '', 'browser');
    expect(result).toBeNull();
  });

  it('returns null when no failed steps are found', async () => {
    mockGetJourneyFailedSteps.mockResolvedValue([]);

    const result = await getStepInformation(mockEsClient, 'check-group-1', 'browser');

    expect(result).toBeNull();
    expect(mockGetJourneyFailedSteps).toHaveBeenCalledWith({
      syntheticsEsClient: mockEsClient,
      checkGroups: ['check-group-1'],
    });
  });

  it('returns step information for failed browser monitor', async () => {
    const mockFailedStep = {
      synthetics: {
        step: {
          name: 'Click button',
          index: 3,
          status: 'failed',
          duration: { us: 1000 },
        },
        payload: {
          source: 'await page.click("button")',
        },
      },
      error: {
        message: 'locator.click failed: Element not found',
      },
    } as any;

    mockGetJourneyFailedSteps.mockResolvedValue([mockFailedStep]);

    const result = await getStepInformation(mockEsClient, 'check-group-1', 'browser');

    expect(result).toEqual({
      stepName: 'Click button',
      scriptSource: 'await page.click("button")',
      stepNumber: 3,
    });
  });

  it('handles missing step data gracefully', async () => {
    const mockFailedStep = {
      synthetics: {
        step: {
          // Missing name and index
        },
        payload: {
          // Missing source
        },
      },
      error: {
        // Missing message
      },
    } as any;

    mockGetJourneyFailedSteps.mockResolvedValue([mockFailedStep]);

    const result = await getStepInformation(mockEsClient, 'check-group-1', 'browser');

    expect(result).toEqual({
      stepName: undefined,
      scriptSource: undefined,
      stepNumber: undefined,
    });
  });

  it('handles errors gracefully and returns null', async () => {
    mockGetJourneyFailedSteps.mockRejectedValue(new Error('Elasticsearch error'));

    const result = await getStepInformation(mockEsClient, 'check-group-1', 'browser');

    expect(result).toBeNull();
  });

  it('returns information from the first failed step when multiple steps fail', async () => {
    const mockFailedSteps = [
      {
        synthetics: {
          step: {
            name: 'First step',
            index: 1,
            status: 'failed',
            duration: { us: 1000 },
          },
          payload: {
            source: 'await page.click("first")',
          },
        },
        error: {
          message: 'First error',
        },
      },
      {
        synthetics: {
          step: {
            name: 'Second step',
            index: 2,
            status: 'failed',
            duration: { us: 2000 },
          },
          payload: {
            source: 'await page.click("second")',
          },
        },
        error: {
          message: 'Second error',
        },
      },
    ] as any;

    mockGetJourneyFailedSteps.mockResolvedValue(mockFailedSteps);

    const result = await getStepInformation(mockEsClient, 'check-group-1', 'browser');

    // Should return information from the first failed step
    expect(result).toEqual({
      stepName: 'First step',
      scriptSource: 'await page.click("first")',
      stepNumber: 1,
    });
  });
});
