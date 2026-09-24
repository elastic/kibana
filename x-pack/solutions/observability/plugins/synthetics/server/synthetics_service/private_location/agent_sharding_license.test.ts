/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { loggerMock } from '@kbn/logging-mocks';
import type { SyntheticsServerSetup } from '../../types';
import { isAgentShardingLicensed } from './agent_sharding_license';

const buildServer = (getLicense: jest.Mock) =>
  ({
    logger: loggerMock.create(),
    pluginsStart: { licensing: { getLicense } },
  } as unknown as SyntheticsServerSetup);

const withLicense = (type: 'basic' | 'platinum' | 'enterprise' | 'trial') =>
  buildServer(jest.fn().mockResolvedValue(licenseMock.createLicense({ license: { type } })));

describe('isAgentShardingLicensed', () => {
  it.each(['enterprise', 'trial'] as const)('is enabled with a %s license', async (type) => {
    expect(await isAgentShardingLicensed(withLicense(type))).toBe(true);
  });

  it.each(['basic', 'platinum'] as const)('is disabled with a %s license', async (type) => {
    expect(await isAgentShardingLicensed(withLicense(type))).toBe(false);
  });

  it('is disabled when the license is expired', async () => {
    const server = buildServer(
      jest
        .fn()
        .mockResolvedValue(
          licenseMock.createLicense({ license: { type: 'enterprise', status: 'expired' } })
        )
    );
    expect(await isAgentShardingLicensed(server)).toBe(false);
  });

  it('is disabled when the license cannot be read', async () => {
    const server = buildServer(jest.fn().mockRejectedValue(new Error('boom')));
    expect(await isAgentShardingLicensed(server)).toBe(false);
    expect(server.logger.error).toHaveBeenCalled();
  });
});
