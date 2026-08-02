/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING,
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
} from '../../../common/constants';
import {
  buildAttackDiscoveryWorkflowsSignalHeaders,
  isAttackDiscoveryWorkflowsEnabledForSpace,
} from '.';

const createLogger = (): Logger =>
  ({ debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as Logger);

const request = {} as KibanaRequest;

const createGetStartServices = (settingValue: boolean | undefined) => {
  const get = jest.fn().mockResolvedValue(settingValue);
  const asScopedToClient = jest.fn().mockReturnValue({ get });
  const asScopedToNamespace = jest.fn().mockReturnValue({});
  const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });
  const getStartServices = jest
    .fn()
    .mockResolvedValue([
      { savedObjects: { getUnsafeInternalClient }, uiSettings: { asScopedToClient } },
      {},
      {},
    ]);

  return { asScopedToNamespace, get, getStartServices };
};

describe('isAttackDiscoveryWorkflowsEnabledForSpace', () => {
  it('returns true when the per-space setting is enabled', async () => {
    const { getStartServices } = createGetStartServices(true);

    const result = await isAttackDiscoveryWorkflowsEnabledForSpace({
      getStartServices: getStartServices as never,
      logger: createLogger(),
      request,
      spaceId: 'agent-3',
    });

    expect(result).toBe(true);
  });

  it('returns false when the per-space setting is disabled', async () => {
    const { getStartServices } = createGetStartServices(false);

    const result = await isAttackDiscoveryWorkflowsEnabledForSpace({
      getStartServices: getStartServices as never,
      logger: createLogger(),
      request,
      spaceId: 'agent-3',
    });

    expect(result).toBe(false);
  });

  it('returns false when the setting is unset', async () => {
    const { getStartServices } = createGetStartServices(undefined);

    const result = await isAttackDiscoveryWorkflowsEnabledForSpace({
      getStartServices: getStartServices as never,
      logger: createLogger(),
      request,
      spaceId: 'agent-3',
    });

    expect(result).toBe(false);
  });

  it('scopes the uiSettings read to the caller space', async () => {
    const { asScopedToNamespace, getStartServices } = createGetStartServices(true);

    await isAttackDiscoveryWorkflowsEnabledForSpace({
      getStartServices: getStartServices as never,
      logger: createLogger(),
      request,
      spaceId: 'agent-3',
    });

    expect(asScopedToNamespace).toHaveBeenCalledWith('agent-3');
  });

  it('reads the AD 2.0 Advanced Setting key', async () => {
    const { get, getStartServices } = createGetStartServices(true);

    await isAttackDiscoveryWorkflowsEnabledForSpace({
      getStartServices: getStartServices as never,
      logger: createLogger(),
      request,
      spaceId: 'agent-3',
    });

    expect(get).toHaveBeenCalledWith(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING);
  });

  it('fails open to true when resolving services throws', async () => {
    const getStartServices = jest.fn().mockRejectedValue(new Error('boom'));

    const result = await isAttackDiscoveryWorkflowsEnabledForSpace({
      getStartServices: getStartServices as never,
      logger: createLogger(),
      request,
      spaceId: 'agent-3',
    });

    expect(result).toBe(true);
  });
});

describe('buildAttackDiscoveryWorkflowsSignalHeaders', () => {
  it('stamps "false" when disabled', () => {
    expect(buildAttackDiscoveryWorkflowsSignalHeaders(false)).toEqual({
      [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false',
    });
  });

  it('stamps "true" when enabled', () => {
    expect(buildAttackDiscoveryWorkflowsSignalHeaders(true)).toEqual({
      [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true',
    });
  });
});
