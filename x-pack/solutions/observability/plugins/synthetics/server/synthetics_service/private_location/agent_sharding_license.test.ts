/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { loggerMock } from '@kbn/logging-mocks';
import type { SyntheticsServerSetup } from '../../types';
import {
  getAgentShardingLicenseStatus,
  getAgentShardingMode,
  isAgentShardingActive,
} from './agent_sharding_license';

type LicenseType = 'basic' | 'platinum' | 'enterprise' | 'trial';

const buildServer = (
  getLicense: jest.Mock,
  taskManagerGet: jest.Mock = jest.fn().mockResolvedValue({ state: {} })
) =>
  ({
    logger: loggerMock.create(),
    pluginsStart: { licensing: { getLicense }, taskManager: { get: taskManagerGet } },
  } as unknown as SyntheticsServerSetup);

const licenseOf = (type: LicenseType) =>
  jest.fn().mockResolvedValue(licenseMock.createLicense({ license: { type } }));

const switchOff = () =>
  jest.fn().mockResolvedValue({ state: { rebalancePrivateLocationShardsEnabled: false } });

describe('getAgentShardingLicenseStatus', () => {
  it.each(['enterprise', 'trial'] as const)('is licensed with a %s license', async (type) => {
    expect(await getAgentShardingLicenseStatus(buildServer(licenseOf(type)))).toBe('licensed');
  });

  it.each(['basic', 'platinum'] as const)('is unlicensed with a %s license', async (type) => {
    expect(await getAgentShardingLicenseStatus(buildServer(licenseOf(type)))).toBe('unlicensed');
  });

  it('is unlicensed when the license is expired', async () => {
    const server = buildServer(
      jest
        .fn()
        .mockResolvedValue(
          licenseMock.createLicense({ license: { type: 'enterprise', status: 'expired' } })
        )
    );
    expect(await getAgentShardingLicenseStatus(server)).toBe('unlicensed');
  });

  it('is unknown when the license is unavailable', async () => {
    const server = buildServer(
      jest.fn().mockResolvedValue({ isAvailable: false, isActive: false, hasAtLeast: () => false })
    );
    expect(await getAgentShardingLicenseStatus(server)).toBe('unknown');
  });

  it('is unknown when the license cannot be read', async () => {
    const server = buildServer(jest.fn().mockRejectedValue(new Error('boom')));
    expect(await getAgentShardingLicenseStatus(server)).toBe('unknown');
    expect(server.logger.error).toHaveBeenCalled();
  });
});

describe('getAgentShardingMode', () => {
  it('is active with an Enterprise license and rebalancing on', async () => {
    expect(await getAgentShardingMode(buildServer(licenseOf('enterprise')))).toBe('active');
    expect(await isAgentShardingActive(buildServer(licenseOf('enterprise')))).toBe(true);
  });

  it('is inactive when shard rebalancing is turned off', async () => {
    const server = buildServer(licenseOf('enterprise'), switchOff());
    expect(await getAgentShardingMode(server)).toBe('inactive');
  });

  it('is inactive without an Enterprise license', async () => {
    expect(await getAgentShardingMode(buildServer(licenseOf('basic')))).toBe('inactive');
  });

  it('is unknown when the license cannot be read and rebalancing is on', async () => {
    const server = buildServer(jest.fn().mockRejectedValue(new Error('boom')));
    expect(await getAgentShardingMode(server)).toBe('unknown');
    expect(await isAgentShardingActive(server)).toBe(false);
  });

  it('is inactive when rebalancing is off, even if the license cannot be read', async () => {
    const server = buildServer(jest.fn().mockRejectedValue(new Error('boom')), switchOff());
    expect(await getAgentShardingMode(server)).toBe('inactive');
  });

  it('treats an unreadable kill-switch as on', async () => {
    const server = buildServer(licenseOf('enterprise'), jest.fn().mockRejectedValue(new Error()));
    expect(await getAgentShardingMode(server)).toBe('active');
  });
});
