/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { AnalyticsGenerationConfig } from './analytics_generation_availability';
import { resolveGenerationModel } from './analytics_generation_availability';

const CONFIG: AnalyticsGenerationConfig = { enabled: true, sampleValues: true };

describe('resolveGenerationModel', () => {
  const setup = ({
    licenseType = 'enterprise',
    licenseStatus = 'active',
  }: { licenseType?: 'enterprise' | 'platinum'; licenseStatus?: 'active' | 'expired' } = {}) => {
    const agentBuilder = agentBuilderMocks.createStart();
    const output = jest.fn().mockResolvedValue({ output: { questions: [] } });
    const calls = [{ connectorId: 'model-a', model: 'model-a-v1' }];
    const getDefaultModel = jest.fn().mockResolvedValue({
      connector: { connectorId: 'model-a', name: 'Model A' },
      inferenceClient: { output },
    });
    const createModelProvider = jest
      .fn()
      .mockReturnValue({ getDefaultModel, getUsageStats: () => ({ calls }) });
    agentBuilder.runtime.createModelProvider = createModelProvider;
    const licensing = licensingMock.createStart();
    licensing.getLicense.mockResolvedValue(
      licensingMock.createLicense({ license: { type: licenseType, status: licenseStatus } })
    );

    return {
      agentBuilder,
      licensing,
      output,
      calls,
      getDefaultModel,
      createModelProvider,
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
    };
  };

  it('resolves the default model as the caller when everything is in place', async () => {
    const { agentBuilder, licensing, output, calls, createModelProvider, request, logger } =
      setup();

    const resolved = await resolveGenerationModel({
      request,
      config: CONFIG,
      dependencies: { agentBuilder, licensing },
      logger,
    });

    expect(resolved).toMatchObject({
      available: true,
      model: { connectorId: 'model-a', name: 'Model A' },
    });
    if (resolved.available) {
      await resolved.model.output({ id: 'test', input: 'hello' });
      expect(output).toHaveBeenCalledWith({ id: 'test', input: 'hello' });
      expect(resolved.model.getCalls()).toBe(calls);
    }
    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      telemetryMetadata: { pluginId: 'search_homepage_analytics' },
    });
  });

  it('uses the configured or requested connector instead of the default model', async () => {
    const { agentBuilder, licensing, createModelProvider, request, logger } = setup();
    const dependencies = { agentBuilder, licensing };

    await resolveGenerationModel({
      request,
      config: { ...CONFIG, connectorId: 'configured' },
      dependencies,
      logger,
    });
    await resolveGenerationModel({
      request,
      config: { ...CONFIG, connectorId: 'configured' },
      dependencies,
      connectorId: 'requested',
      logger,
    });

    expect(createModelProvider.mock.calls.map(([options]) => options.defaultConnectorId)).toEqual([
      'configured',
      'requested',
    ]);
  });

  it('is unavailable when turned off, without asking for a licence or a model', async () => {
    const { agentBuilder, licensing, createModelProvider, request, logger } = setup();

    await expect(
      resolveGenerationModel({
        request,
        config: { ...CONFIG, enabled: false },
        dependencies: { agentBuilder, licensing },
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'disabled' });
    expect(licensing.getLicense).not.toHaveBeenCalled();
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('is unavailable without Agent Builder', async () => {
    const { licensing, request, logger } = setup();

    await expect(
      resolveGenerationModel({ request, config: CONFIG, dependencies: { licensing }, logger })
    ).resolves.toEqual({ available: false, reason: 'agentBuilderMissing' });
  });

  it.each([
    ['below Enterprise', setup({ licenseType: 'platinum' })],
    ['expired', setup({ licenseStatus: 'expired' })],
  ])('is unavailable when the licence is %s', async (_, context) => {
    const { agentBuilder, licensing, createModelProvider, request, logger } = context;

    await expect(
      resolveGenerationModel({
        request,
        config: CONFIG,
        dependencies: { agentBuilder, licensing },
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'license' });
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('is unavailable without the licensing plugin', async () => {
    const { agentBuilder, request, logger } = setup();

    await expect(
      resolveGenerationModel({ request, config: CONFIG, dependencies: { agentBuilder }, logger })
    ).resolves.toEqual({ available: false, reason: 'license' });
  });

  it('is unavailable, and says why in the log, when no model can be resolved', async () => {
    const { agentBuilder, licensing, getDefaultModel, request, logger } = setup();
    getDefaultModel.mockRejectedValue(new Error('No connector available'));

    await expect(
      resolveGenerationModel({
        request,
        config: CONFIG,
        dependencies: { agentBuilder, licensing },
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'noModel' });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No connector available'));
  });
});
