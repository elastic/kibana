/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { deletePackagePolicyRoute, getConfigIdFromPackagePolicy } from './delete_integration';

const buildPolicy = (processors?: string): PackagePolicy =>
  ({
    id: 'policy-1',
    inputs: [
      { streams: [{ vars: {} }] },
      { streams: [{ vars: processors ? { processors: { value: processors } } : {} }] },
    ],
  } as unknown as PackagePolicy);

const processorsFor = (configId: string) =>
  JSON.stringify([{ add_fields: { fields: { config_id: configId, meta: { space_id: 'a' } } } }]);

describe('getConfigIdFromPackagePolicy', () => {
  it('reads config_id from the stream processors', () => {
    expect(getConfigIdFromPackagePolicy(buildPolicy(processorsFor('monitor-1')))).toBe('monitor-1');
  });

  it('returns undefined without processors or with invalid JSON', () => {
    expect(getConfigIdFromPackagePolicy(buildPolicy())).toBeUndefined();
    expect(getConfigIdFromPackagePolicy(buildPolicy('not-json'))).toBeUndefined();
  });
});

describe('deletePackagePolicyRoute', () => {
  const setup = ({ policy, total }: { policy: PackagePolicy | null; total: number }) => {
    const find = jest.fn().mockResolvedValue({ total, saved_objects: [] });
    const fleetDelete = jest.fn().mockResolvedValue([{ id: 'policy-1', success: true }]);
    const response = { conflict: jest.fn((args) => ({ status: 409, ...args })) };
    const context = {
      request: { params: { packagePolicyId: 'policy-1' } },
      response,
      savedObjectsClient: {},
      syntheticsEsClient: { baseESClient: {} },
      server: {
        coreStart: { savedObjects: { createInternalRepository: () => ({ find }) } },
        fleet: {
          packagePolicyService: {
            get: jest.fn().mockResolvedValue(policy),
            delete: fleetDelete,
          },
        },
      },
    };
    const run = () => deletePackagePolicyRoute().handler(context as never);
    return { run, find, fleetDelete, response };
  };

  it('refuses to delete an integration whose monitor exists in any space', async () => {
    const { run, find, fleetDelete, response } = setup({
      policy: buildPolicy(processorsFor('monitor-1')),
      total: 1,
    });

    await run();

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        namespaces: ['*'],
        filter: expect.stringContaining('"monitor-1"'),
      })
    );
    expect(response.conflict).toHaveBeenCalled();
    expect(fleetDelete).not.toHaveBeenCalled();
  });

  it('deletes a leftover integration whose monitor no longer exists', async () => {
    const { run, fleetDelete, response } = setup({
      policy: buildPolicy(processorsFor('monitor-1')),
      total: 0,
    });

    await run();

    expect(response.conflict).not.toHaveBeenCalled();
    expect(fleetDelete).toHaveBeenCalledWith(expect.anything(), expect.anything(), ['policy-1'], {
      force: true,
    });
  });
});
