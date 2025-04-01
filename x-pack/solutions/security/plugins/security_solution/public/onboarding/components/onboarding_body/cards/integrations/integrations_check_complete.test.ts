/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { checkIntegrationsCardComplete } from './integrations_check_complete';
import { installationStatuses } from '@kbn/fleet-plugin/public';
import type { StartServices } from '../../../../../types';

import { lastValueFrom } from 'rxjs';

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
        installedIntegrationsCount: 0,
        isAgentRequired: false,
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
        installedIntegrationsCount: 1,
        isAgentRequired: true,
      },
    });
  });

  it('returns isComplete as true and isAgentRequired as false when both packages and agent data are available', async () => {
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
        installedIntegrationsCount: 2,
        isAgentRequired: false,
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
        installedIntegrationsCount: 0,
        isAgentRequired: false,
      },
    });
  });

  it('renders an error toast when fetching agents data fails', async () => {
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
        installedIntegrationsCount: 0,
        isAgentRequired: false,
      },
    });
  });
});
