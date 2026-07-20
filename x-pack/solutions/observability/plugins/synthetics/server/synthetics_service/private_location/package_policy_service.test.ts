/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyService } from './package_policy_service';
import type { SyntheticsServerSetup } from '../../types';

const makeServer = (bulkCreateMock: jest.Mock) => {
  const soClient = {} as SavedObjectsClientContract;
  const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  const server = {
    coreStart: {
      savedObjects: {
        getUnsafeInternalClient: () => ({ asScopedToNamespace: () => soClient }),
      },
      elasticsearch: { client: { asInternalUser: {} } },
    },
    fleet: { packagePolicyService: { bulkCreate: bulkCreateMock } },
    logger,
  } as unknown as SyntheticsServerSetup;
  return { server, logger };
};

const policy = (id: string) =>
  ({ id, name: id, policy_ids: ['ap-1'] } as unknown as NewPackagePolicyWithId);

describe('PackagePolicyService.bulkCreate retry of failed creates', () => {
  test('returns early without calling fleet when there are no policies', async () => {
    const bulkCreateMock = jest.fn();
    const { server } = makeServer(bulkCreateMock);

    const res = await new PackagePolicyService(server).bulkCreate({
      newPolicies: [],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(res).toEqual({ created: [], failed: [] });
    expect(bulkCreateMock).not.toHaveBeenCalled();
  });

  test('retries only the failed policies and merges the created results (retryFailed)', async () => {
    const bulkCreateMock = jest
      .fn()
      // first attempt: p-2 fails
      .mockResolvedValueOnce({
        created: [policy('p-1'), policy('p-3')],
        failed: [{ packagePolicy: policy('p-2'), error: new Error('boom') }],
      })
      // retry attempt: only p-2 is retried and now succeeds
      .mockResolvedValueOnce({ created: [policy('p-2')], failed: [] });

    const { server } = makeServer(bulkCreateMock);

    const res = await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy('p-1'), policy('p-2'), policy('p-3')],
      spaceId: DEFAULT_SPACE_ID,
      retryFailed: true,
    });

    expect(bulkCreateMock).toHaveBeenCalledTimes(2);
    // retry received ONLY the failed policy, not the whole batch
    const retriedPolicies = bulkCreateMock.mock.calls[1][2];
    expect(retriedPolicies.map((p: NewPackagePolicyWithId) => p.id)).toEqual(['p-2']);

    expect(res.failed).toEqual([]);
    expect(res.created.map((p: NewPackagePolicyWithId) => p.id).sort()).toEqual([
      'p-1',
      'p-2',
      'p-3',
    ]);
  });

  test('stops after the max attempts and returns the still-failing policies (retryFailed)', async () => {
    const failure = { packagePolicy: policy('p-2'), error: new Error('boom') };
    const bulkCreateMock = jest
      .fn()
      .mockResolvedValue({ created: [], failed: [failure] }); // always fails

    const { server } = makeServer(bulkCreateMock);

    const res = await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy('p-2')],
      spaceId: DEFAULT_SPACE_ID,
      retryFailed: true,
    });

    // 1 initial attempt + 2 retries
    expect(bulkCreateMock).toHaveBeenCalledTimes(3);
    expect(res.failed).toHaveLength(1);
    expect((res.failed[0].packagePolicy as NewPackagePolicyWithId).id).toBe('p-2');
  });

  test('does NOT retry failures when retryFailed is not set (non-sync callers)', async () => {
    const failure = { packagePolicy: policy('p-2'), error: new Error('boom') };
    const bulkCreateMock = jest.fn().mockResolvedValue({ created: [], failed: [failure] });

    const { server } = makeServer(bulkCreateMock);

    const res = await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy('p-2')],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(bulkCreateMock).toHaveBeenCalledTimes(1);
    expect(res.failed).toHaveLength(1);
  });

  test('does not retry when the first attempt fully succeeds', async () => {
    const bulkCreateMock = jest
      .fn()
      .mockResolvedValueOnce({ created: [policy('p-1')], failed: [] });

    const { server } = makeServer(bulkCreateMock);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy('p-1')],
      spaceId: DEFAULT_SPACE_ID,
      retryFailed: true,
    });

    expect(bulkCreateMock).toHaveBeenCalledTimes(1);
  });
});
