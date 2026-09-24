/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { SignificantEventsServer } from '../../types';
import { assertCanManageRunQuotas, canManageRunQuotas } from './privileges';

const request = {} as KibanaRequest;

const createServer = (hasAllRequested: boolean) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested });
  const get = jest.fn().mockImplementation((privilege: string) => privilege);
  const server = {
    security: {
      authz: {
        actions: { api: { get } },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
      },
    },
  } as unknown as SignificantEventsServer;

  return { server, get, globally };
};

describe('run quota global management privilege', () => {
  it('checks Nightshift manage and configure globally', async () => {
    const { server, get, globally } = createServer(true);

    await expect(canManageRunQuotas({ request, server })).resolves.toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(NIGHTSHIFT_API_PRIVILEGES.manage);
    expect(get).toHaveBeenCalledWith(NIGHTSHIFT_API_PRIVILEGES.configure);
    expect(globally).toHaveBeenCalledWith({
      kibana: [NIGHTSHIFT_API_PRIVILEGES.manage, NIGHTSHIFT_API_PRIVILEGES.configure],
    });
  });

  it('denies settings management without Nightshift manage and configure in every space', async () => {
    const { server } = createServer(false);

    await expect(assertCanManageRunQuotas({ request, server })).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
  });
});
