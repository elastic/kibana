/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { installationStatuses } from '@kbn/fleet-plugin/public';
import { lastValueFrom } from 'rxjs';
import { checkIntegrationsCardComplete } from './integrations_check_complete';
import type { StartServices } from '../../../../../types';

jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  lastValueFrom: jest.fn(),
}));

describe('checkIntegrationsCardComplete', () => {
  const mockLastValueFrom = lastValueFrom as jest.Mock;
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isComplete as false when no packages are active', async () => {
    mockHttpGet.mockResolvedValue({
      items: [],
    });

    mockLastValueFrom.mockResolvedValue({
      rawResponse: {
        hits: { total: 0 },
      },
    });

    const result = await checkIntegrationsCardComplete(mockService);

    expect(result).toEqual({
      isComplete: false,
      metadata: {
        isAgentRequired: true,
        activeIntegrations: [],
      },
    });
  });

  it('returns isComplete as true when packages are active but no agent data is available', async () => {
    const mockActiveIntegrations = [
      {
        status: installationStatuses.Installed,
        dataStreams: [
          {
            name: 'test-data-stream',
            title: 'Test Data Stream',
          },
        ],
      },
    ];
    mockHttpGet.mockResolvedValue({
      items: mockActiveIntegrations,
    });

    mockLastValueFrom.mockResolvedValue({
      rawResponse: {
        hits: { total: 0 },
      },
    });

    const result = await checkIntegrationsCardComplete(mockService);

    expect(result).toEqual({
      isComplete: true,
      completeBadgeText: '1 integration added',
      metadata: {
        isAgentRequired: false,
        activeIntegrations: mockActiveIntegrations,
      },
    });
  });

  it('returns isComplete as true and isAgentRequired as false when both packages and agent data are available', async () => {
    const mockActiveIntegrations = [
      {
        status: installationStatuses.Installed,
        dataStreams: [
          {
            name: 'test-data-stream 1',
            title: 'Test Data Stream 1',
          },
        ],
      },
      {
        status: installationStatuses.InstallFailed,
        dataStreams: [
          {
            name: 'test-data-stream 2',
            title: 'Test Data Stream 2',
          },
        ],
      },
    ];

    mockHttpGet.mockResolvedValue({
      items: mockActiveIntegrations,
    });

    mockLastValueFrom.mockResolvedValue({
      rawResponse: {
        hits: { total: 1 },
      },
    });

    const result = await checkIntegrationsCardComplete(mockService);

    expect(result).toEqual({
      isComplete: true,
      completeBadgeText: '2 integrations added',
      metadata: {
        isAgentRequired: false,
        activeIntegrations: mockActiveIntegrations,
      },
    });
  });

  it('renders an error toast when fetching integrations data fails', async () => {
    const err = new Error('Failed to fetch integrations data');
    mockHttpGet.mockRejectedValue(err);
    mockLastValueFrom.mockResolvedValue({
      rawResponse: {
        hits: { total: 0 },
      },
    });

    const res = await checkIntegrationsCardComplete(mockService);

    expect(mockService.notifications.toasts.addError).toHaveBeenCalledWith(err, {
      title: 'Error fetching integrations data',
    });
    expect(res).toEqual({
      isComplete: false,
      metadata: {
        isAgentRequired: true,
        activeIntegrations: [],
      },
    });
  });

  it('renders an error toast when fetching agents data fails', async () => {
    mockHttpGet.mockResolvedValue({
      items: [],
    });

    const err = new Error('Failed to fetch agents data');
    mockLastValueFrom.mockRejectedValue(err);

    const res = await checkIntegrationsCardComplete(mockService);

    expect(mockService.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Failed to fetch agents data'),
      {
        title: 'Error fetching agents data',
      }
    );
    expect(res).toEqual({
      isComplete: false,
      metadata: {
        isAgentRequired: true,
        activeIntegrations: [],
      },
    });
  });
});
