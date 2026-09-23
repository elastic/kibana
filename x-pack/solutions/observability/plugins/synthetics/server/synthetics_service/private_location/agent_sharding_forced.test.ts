/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { loggerMock } from '@kbn/logging-mocks';
import type { SyntheticsServerSetup } from '../../types';
import { applyForcedAgentSharding, isAgentShardingForced } from './agent_sharding_forced';

const buildServer = ({
  isCloudEnabled = false,
  isServerlessEnabled = false,
  licenseType = 'enterprise',
  getLicense,
}: {
  isCloudEnabled?: boolean;
  isServerlessEnabled?: boolean;
  licenseType?: 'basic' | 'platinum' | 'enterprise' | 'trial';
  getLicense?: jest.Mock;
} = {}) =>
  ({
    cloud: { isCloudEnabled, isServerlessEnabled },
    logger: loggerMock.create(),
    pluginsStart: {
      licensing: {
        getLicense:
          getLicense ??
          jest
            .fn()
            .mockResolvedValue(licenseMock.createLicense({ license: { type: licenseType } })),
      },
    },
  } as unknown as SyntheticsServerSetup);

describe('isAgentShardingForced', () => {
  it('is forced on Cloud with an Enterprise license', async () => {
    expect(await isAgentShardingForced(buildServer({ isCloudEnabled: true }))).toBe(true);
  });

  it('is forced on Serverless with an Enterprise license', async () => {
    expect(await isAgentShardingForced(buildServer({ isServerlessEnabled: true }))).toBe(true);
  });

  it('is forced on Cloud with a trial license', async () => {
    expect(
      await isAgentShardingForced(buildServer({ isCloudEnabled: true, licenseType: 'trial' }))
    ).toBe(true);
  });

  it('is not forced on Cloud below Enterprise', async () => {
    expect(
      await isAgentShardingForced(buildServer({ isCloudEnabled: true, licenseType: 'platinum' }))
    ).toBe(false);
  });

  it('is not forced self-managed, even with Enterprise', async () => {
    const server = buildServer();
    expect(await isAgentShardingForced(server)).toBe(false);
    expect(server.pluginsStart.licensing.getLicense).not.toHaveBeenCalled();
  });

  it('is not forced when the license cannot be read', async () => {
    const server = buildServer({
      isCloudEnabled: true,
      getLicense: jest.fn().mockRejectedValue(new Error('boom')),
    });
    expect(await isAgentShardingForced(server)).toBe(false);
    expect(server.logger.error).toHaveBeenCalled();
  });
});

describe('applyForcedAgentSharding', () => {
  const locations = [{ id: 'a' }, { id: 'b', isAgentSharding: false }];

  it('marks every location as sharded when forced', () => {
    expect(applyForcedAgentSharding(locations, true)).toEqual([
      { id: 'a', isAgentSharding: true },
      { id: 'b', isAgentSharding: true },
    ]);
  });

  it('returns stored locations untouched when not forced', () => {
    expect(applyForcedAgentSharding(locations, false)).toBe(locations);
  });
});
