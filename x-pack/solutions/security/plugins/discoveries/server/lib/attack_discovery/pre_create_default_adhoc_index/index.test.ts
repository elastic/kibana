/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { preCreateDefaultAdhocAttackDiscoveryIndex } from '.';

const flushPromises = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

const createLogger = (): Logger => ({ warn: jest.fn() } as unknown as Logger);

const createDataClient = (getWriter = jest.fn().mockResolvedValue({})) =>
  ({ getWriter } as unknown as IRuleDataClient);

const createCore = (getComponentTemplate: jest.Mock): CoreSetup =>
  ({
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: { asInternalUser: { cluster: { getComponentTemplate } } },
        },
      },
    ]),
  } as unknown as CoreSetup);

describe('preCreateDefaultAdhocAttackDiscoveryIndex', () => {
  const contextNotRegistered = async () => ({
    result: false,
    error:
      'Error getting initialized status for context security.attack.discovery - context has not been registered.',
  });

  it('calls getWriter for the default space when framework alerts are disabled', () => {
    const dataClient = createDataClient();

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(jest.fn()),
      dataClient,
      logger: createLogger(),
    });

    expect(dataClient.getWriter).toHaveBeenCalledWith({ namespace: 'default' });
  });

  it('does not call getWriter before attack discovery resources are initialized', async () => {
    const dataClient = createDataClient();
    let resolveInitialization: (value: { result: boolean }) => void = () => undefined;
    const initialization = new Promise<{ result: boolean }>((resolve) => {
      resolveInitialization = resolve;
    });

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(jest.fn()),
      dataClient,
      frameworkAlerts: {
        enabled: () => true,
        getContextInitializationPromise: () => initialization,
      },
      logger: createLogger(),
    });

    await flushPromises();

    expect(dataClient.getWriter).not.toHaveBeenCalled();
    resolveInitialization({ result: true });
    await flushPromises();
  });

  it('calls getWriter for the default space after attack discovery resources are initialized', async () => {
    const dataClient = createDataClient();
    const getComponentTemplate = jest.fn();

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(getComponentTemplate),
      dataClient,
      frameworkAlerts: {
        enabled: () => true,
        getContextInitializationPromise: async () => ({ result: true }),
      },
      logger: createLogger(),
    });

    await flushPromises();

    expect(dataClient.getWriter).toHaveBeenCalledWith({ namespace: 'default' });
  });

  it('does not poll for the component template after attack discovery resources are initialized', async () => {
    const getComponentTemplate = jest.fn();

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(getComponentTemplate),
      dataClient: createDataClient(),
      frameworkAlerts: {
        enabled: () => true,
        getContextInitializationPromise: async () => ({ result: true }),
      },
      logger: createLogger(),
    });

    await flushPromises();

    expect(getComponentTemplate).not.toHaveBeenCalled();
  });

  it('does not install the index when alerting resources fail', async () => {
    const dataClient = createDataClient();

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(jest.fn()),
      dataClient,
      frameworkAlerts: {
        enabled: () => true,
        getContextInitializationPromise: async () => ({
          result: false,
          error: 'Common resources were not initialized',
        }),
      },
      logger: createLogger(),
    });

    await flushPromises();

    expect(dataClient.getWriter).not.toHaveBeenCalled();
  });

  it('logs when alerting resources fail', async () => {
    const logger = createLogger();

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(jest.fn()),
      dataClient: createDataClient(),
      frameworkAlerts: {
        enabled: () => true,
        getContextInitializationPromise: async () => ({
          result: false,
          error: 'Common resources were not initialized',
        }),
      },
      logger,
    });

    await flushPromises();

    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to pre-create ad-hoc Attack Discovery index for the default space: alerting resources were not initialized: Common resources were not initialized'
    );
  });

  it('does not call getWriter before the ECS component template exists', async () => {
    const dataClient = createDataClient();
    const getComponentTemplate = jest.fn(() => new Promise(() => undefined));

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(getComponentTemplate),
      dataClient,
      frameworkAlerts: {
        enabled: () => true,
        getContextInitializationPromise: contextNotRegistered,
      },
      logger: createLogger(),
    });

    await flushPromises();

    expect(dataClient.getWriter).not.toHaveBeenCalled();
  });

  it('calls getWriter for the default space after the ECS component template exists', async () => {
    const dataClient = createDataClient();

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(jest.fn().mockResolvedValue({})),
      dataClient,
      frameworkAlerts: { enabled: () => true },
      logger: createLogger(),
    });

    await flushPromises();

    expect(dataClient.getWriter).toHaveBeenCalledWith({ namespace: 'default' });
  });

  it('does not call getWriter when the ECS component template is missing', async () => {
    jest.useFakeTimers();
    const dataClient = createDataClient();

    try {
      preCreateDefaultAdhocAttackDiscoveryIndex({
        core: createCore(jest.fn().mockRejectedValue(new Error('resource_not_found_exception'))),
        dataClient,
        frameworkAlerts: { enabled: () => true },
        logger: createLogger(),
      });

      await jest.advanceTimersByTimeAsync(60_000);

      expect(dataClient.getWriter).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('logs when the ECS component template is missing', async () => {
    jest.useFakeTimers();
    const logger = createLogger();

    try {
      preCreateDefaultAdhocAttackDiscoveryIndex({
        core: createCore(jest.fn().mockRejectedValue(new Error('resource_not_found_exception'))),
        dataClient: createDataClient(),
        frameworkAlerts: { enabled: () => true },
        logger,
      });

      await jest.advanceTimersByTimeAsync(60_000);

      expect(logger.warn).toHaveBeenCalledWith(
        'Unable to pre-create ad-hoc Attack Discovery index for the default space: .alerts-ecs-mappings is not available: resource_not_found_exception'
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('logs when the default space index cannot be installed', async () => {
    const logger = createLogger();
    const dataClient = createDataClient(jest.fn().mockRejectedValue(new Error('writes disabled')));

    preCreateDefaultAdhocAttackDiscoveryIndex({
      core: createCore(jest.fn()),
      dataClient,
      logger,
    });

    await flushPromises();

    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to pre-create ad-hoc Attack Discovery index for the default space: writes disabled'
    );
  });
});
