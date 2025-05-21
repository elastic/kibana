/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { StartServices } from '../../../../../../types';
import {
  getAgentsData,
  getCompleteBadgeText,
  getActiveIntegrationList,
} from './integrations_check_complete_helpers';

jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  lastValueFrom: jest.fn(),
}));

const mockHttpGet: jest.Mock = jest.fn();
const mockSearch: jest.Mock = jest.fn();
const mockService = {
  http: {
    get: mockHttpGet,
  },
  data: {
    search: {
      search: mockSearch,
    },
  },
  notifications: {
    toasts: {
      addError: jest.fn(),
    },
  },
} as unknown as StartServices;

describe('getCompleteBadgeText', () => {
  it('returns the correct badge text when there is one installed integration', () => {
    const badgeText = getCompleteBadgeText(1);
    expect(badgeText).toBe('1 integration added');
  });

  it('returns the correct badge text when there are multiple installed integrations', () => {
    const badgeText = getCompleteBadgeText(3);
    expect(badgeText).toBe('3 integrations added');
  });
});

describe('getActiveIntegrationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns installed integrations according to the provided card names', async () => {
    const activeIntegrations = [
      {
        name: 'test',
        version: '1.0.0',
        status: 'installed',
        dataStreams: [{ name: 'test-data-stream', title: 'test' }],
      },
      {
        name: 'test2',
        version: '1.0.0',
        status: 'installed',
        dataStreams: [{ name: 'test-data-stream', title: 'test' }],
      },
    ];

    mockHttpGet.mockResolvedValue({
      items: activeIntegrations,
    });

    const cardNames = ['test'];
    const { activePackages } = await getActiveIntegrationList(mockService, cardNames);
    expect(activePackages).toEqual([activeIntegrations[0]]);
  });

  it('returns all installed integrations when no card names are provided', async () => {
    const activeIntegrations = [
      {
        name: 'test',
        version: '1.0.0',
        status: 'installed',
        dataStreams: [{ name: 'test-data-stream', title: 'test' }],
      },
      {
        name: 'test2',
        version: '1.0.0',
        status: 'installed',
        dataStreams: [{ name: 'test-data-stream', title: 'test' }],
      },
      {
        name: 'test3',
        version: '1.0.0',
        status: 'installed',
        dataStreams: [{ name: 'test-data-stream', title: 'test' }],
      },
    ];

    mockHttpGet.mockResolvedValue({
      items: activeIntegrations,
    });

    const { activePackages } = await getActiveIntegrationList(mockService);
    expect(activePackages).toEqual(activeIntegrations);
  });

  it('return isComplete as false when no packages are installed', async () => {
    mockHttpGet.mockResolvedValue({
      items: [],
    });

    const result = await getActiveIntegrationList(mockService);

    expect(result).toEqual({
      isComplete: false,
      activePackages: [],
    });
  });
});

describe('getAgentsData', () => {
  const mockLastValueFrom = lastValueFrom as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isAgentRequired as true when no agent data is available', async () => {
    const mockAgentsData = {
      rawResponse: {
        hits: { total: 0 },
      },
    };
    mockLastValueFrom.mockResolvedValue(mockAgentsData);

    const result = await getAgentsData(mockService, false);

    expect(result).toEqual({
      isAgentRequired: true,
      agentsData: mockAgentsData,
    });
  });

  it('returns isAgentRequired as false when agent data is available', async () => {
    const mockAgentsData = {
      rawResponse: {
        hits: { total: 1 },
      },
    };
    mockLastValueFrom.mockResolvedValue(mockAgentsData);

    const result = await getAgentsData(mockService, true);

    expect(result).toEqual({
      isAgentRequired: false,
      agentsData: mockAgentsData,
    });
  });

  it('returns isAgentRequired as false when agent data is Not available and isComplete is true', async () => {
    const mockAgentsData = {
      rawResponse: {
        hits: { total: 0 },
      },
    };
    mockLastValueFrom.mockResolvedValue(mockAgentsData);

    const result = await getAgentsData(mockService, true);

    expect(result).toEqual({
      isAgentRequired: false,
      agentsData: mockAgentsData,
    });
  });

  it('handles errors when fetching agent data', async () => {
    mockLastValueFrom.mockRejectedValue(new Error('Failed to fetch agent data'));
    await getAgentsData(mockService, false);
    expect(mockService.notifications.toasts.addError).toHaveBeenCalled();
  });
});
