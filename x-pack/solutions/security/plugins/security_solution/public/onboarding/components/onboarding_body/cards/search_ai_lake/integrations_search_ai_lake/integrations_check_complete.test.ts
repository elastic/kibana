/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { installationStatuses } from '@kbn/fleet-plugin/public';
import { lastValueFrom } from 'rxjs';
import { checkIntegrationsCardComplete } from './integrations_check_complete';
import type { StartServices } from '../../../../../../types';

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

  it('returns isComplete as false when no packages are installed', async () => {
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
        activeIntegrations: [],
      },
    });
  });

  it('returns isComplete as true when packages are installed but no agent data is available', async () => {
    mockHttpGet.mockResolvedValue({
      items: [{ status: installationStatuses.Installed }],
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
        activeIntegrations: [
          {
            status: installationStatuses.Installed,
          },
        ],
      },
    });
  });

  it('returns isComplete as true when packages are available', async () => {
    mockHttpGet.mockResolvedValue({
      items: [
        { status: installationStatuses.Installed },
        { status: installationStatuses.InstallFailed },
      ],
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
        activeIntegrations: [
          { status: installationStatuses.Installed },
          { status: installationStatuses.InstallFailed },
        ],
      },
    });
  });

  it('renders an error toast when fetching integrations data fails', async () => {
    const err = new Error('Failed to fetch integrations data');
    mockHttpGet.mockRejectedValue(err);

    const res = await checkIntegrationsCardComplete(mockService);

    expect(mockService.notifications.toasts.addError).toHaveBeenCalledWith(err, {
      title: 'Error fetching integrations data',
    });
    expect(res).toEqual({
      isComplete: false,
      metadata: {
        activeIntegrations: [],
      },
    });
  });
});
