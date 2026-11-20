/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { createInferenceRequestError } from '@kbn/inference-common';
import type { AnalyticsGenerationConfig } from './analytics_generation_availability';
import {
  PREFERRED_ENDPOINT_RETRY_MS,
  PREFERRED_GENERATION_ENDPOINT_ID,
  createPreferredEndpointTracker,
  resolveGenerationModel,
} from './analytics_generation_availability';

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
    /** Ids the deployment lacks: resolving one fails the way the connector lookup does. */
    const missingIds = new Set<string>();
    const createModelProvider = jest
      .fn()
      .mockImplementation(({ defaultConnectorId }: { defaultConnectorId?: string }) => ({
        getDefaultModel:
          defaultConnectorId === undefined
            ? getDefaultModel
            : async () => {
                if (missingIds.has(defaultConnectorId)) {
                  throw createInferenceRequestError(
                    `No connector or inference endpoint found for ID '${defaultConnectorId}'`,
                    404
                  );
                }
                return {
                  connector: { connectorId: defaultConnectorId, name: defaultConnectorId },
                  inferenceClient: { output },
                };
              },
        getUsageStats: () => ({ calls }),
      }));
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
      missingIds,
      createModelProvider,
      preferredEndpoint: createPreferredEndpointTracker(),
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
    };
  };

  it("resolves Agent Builder's default model as the caller when the preferred endpoint is missing", async () => {
    const {
      agentBuilder,
      licensing,
      output,
      calls,
      missingIds,
      createModelProvider,
      request,
      logger,
      preferredEndpoint,
    } = setup();
    missingIds.add(PREFERRED_GENERATION_ENDPOINT_ID);

    const resolved = await resolveGenerationModel({
      request,
      config: CONFIG,
      dependencies: { agentBuilder, licensing },
      preferredEndpoint,
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
    expect(createModelProvider).toHaveBeenLastCalledWith({
      request,
      telemetryMetadata: { pluginId: 'search_homepage_analytics' },
    });
  });

  it('uses the configured connector, without asking for the preferred endpoint', async () => {
    const { agentBuilder, licensing, createModelProvider, request, logger, preferredEndpoint } =
      setup();

    const resolved = await resolveGenerationModel({
      request,
      config: { ...CONFIG, connectorId: 'configured' },
      dependencies: { agentBuilder, licensing },
      preferredEndpoint,
      logger,
    });

    expect(resolved).toMatchObject({ available: true, model: { connectorId: 'configured' } });
    expect(createModelProvider.mock.calls.map(([options]) => options.defaultConnectorId)).toEqual([
      'configured',
    ]);
  });

  it('is unavailable, without falling back, when the configured connector cannot be resolved', async () => {
    const {
      agentBuilder,
      licensing,
      missingIds,
      getDefaultModel,
      request,
      logger,
      preferredEndpoint,
    } = setup();
    missingIds.add('configured');

    await expect(
      resolveGenerationModel({
        request,
        config: { ...CONFIG, connectorId: 'configured' },
        dependencies: { agentBuilder, licensing },
        preferredEndpoint,
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'noModel' });
    expect(getDefaultModel).not.toHaveBeenCalled();
  });

  it('uses the preferred endpoint when the deployment has it', async () => {
    const {
      agentBuilder,
      licensing,
      getDefaultModel,
      createModelProvider,
      request,
      logger,
      preferredEndpoint,
    } = setup();

    const resolved = await resolveGenerationModel({
      request,
      config: CONFIG,
      dependencies: { agentBuilder, licensing },
      preferredEndpoint,
      logger,
    });

    expect(PREFERRED_GENERATION_ENDPOINT_ID).toBe('.anthropic-claude-5.5-sonnet-chat_completion');
    expect(resolved).toMatchObject({
      available: true,
      model: { connectorId: PREFERRED_GENERATION_ENDPOINT_ID },
    });
    expect(createModelProvider).toHaveBeenCalledTimes(1);
    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: PREFERRED_GENERATION_ENDPOINT_ID,
      telemetryMetadata: { pluginId: 'search_homepage_analytics' },
    });
    expect(getDefaultModel).not.toHaveBeenCalled();
  });

  describe('without the preferred endpoint', () => {
    const resolveTwice = async (context: ReturnType<typeof setup>) => {
      const { agentBuilder, licensing, request, logger, preferredEndpoint } = context;
      const options = {
        request,
        config: CONFIG,
        dependencies: { agentBuilder, licensing },
        preferredEndpoint,
        logger,
      };

      return [await resolveGenerationModel(options), await resolveGenerationModel(options)];
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it("falls back to Agent Builder's default model and does not look the endpoint up again", async () => {
      const context = setup();
      context.missingIds.add(PREFERRED_GENERATION_ENDPOINT_ID);

      const resolved = await resolveTwice(context);

      expect(resolved).toEqual([
        expect.objectContaining({
          available: true,
          model: expect.objectContaining({ connectorId: 'model-a' }),
        }),
        expect.objectContaining({
          available: true,
          model: expect.objectContaining({ connectorId: 'model-a' }),
        }),
      ]);
      expect(
        context.createModelProvider.mock.calls.map(([options]) => options.defaultConnectorId)
      ).toEqual([PREFERRED_GENERATION_ENDPOINT_ID, undefined, undefined]);
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to the default model')
      );
    });

    it('looks the endpoint up again after a while, and uses it once it is there', async () => {
      jest.useFakeTimers();
      const context = setup();
      context.missingIds.add(PREFERRED_GENERATION_ENDPOINT_ID);
      await resolveTwice(context);

      context.missingIds.clear();
      jest.advanceTimersByTime(PREFERRED_ENDPOINT_RETRY_MS);
      const [resolved] = await resolveTwice(context);

      expect(resolved).toMatchObject({
        available: true,
        model: { connectorId: PREFERRED_GENERATION_ENDPOINT_ID },
      });
    });

    it('falls back on any other failure too, but asks again the next time', async () => {
      const context = setup();
      context.createModelProvider.mockImplementationOnce(() => ({
        getDefaultModel: jest.fn().mockRejectedValue(new Error('socket hang up')),
        getUsageStats: () => ({ calls: [] }),
      }));

      const resolved = await resolveTwice(context);

      expect(resolved).toEqual([
        expect.objectContaining({ model: expect.objectContaining({ connectorId: 'model-a' }) }),
        expect.objectContaining({
          model: expect.objectContaining({ connectorId: PREFERRED_GENERATION_ENDPOINT_ID }),
        }),
      ]);
    });
  });

  it('is unavailable when turned off, without asking for a licence or a model', async () => {
    const { agentBuilder, licensing, createModelProvider, request, logger, preferredEndpoint } =
      setup();

    await expect(
      resolveGenerationModel({
        request,
        config: { ...CONFIG, enabled: false },
        dependencies: { agentBuilder, licensing },
        preferredEndpoint,
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'disabled' });
    expect(licensing.getLicense).not.toHaveBeenCalled();
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('is unavailable without Agent Builder', async () => {
    const { licensing, request, logger, preferredEndpoint } = setup();

    await expect(
      resolveGenerationModel({
        request,
        config: CONFIG,
        dependencies: { licensing },
        preferredEndpoint,
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'agentBuilderMissing' });
  });

  it.each([
    ['below Enterprise', setup({ licenseType: 'platinum' })],
    ['expired', setup({ licenseStatus: 'expired' })],
  ])('is unavailable when the licence is %s', async (_, context) => {
    const { agentBuilder, licensing, createModelProvider, request, logger, preferredEndpoint } =
      context;

    await expect(
      resolveGenerationModel({
        request,
        config: CONFIG,
        dependencies: { agentBuilder, licensing },
        preferredEndpoint,
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'license' });
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('is unavailable without the licensing plugin', async () => {
    const { agentBuilder, request, logger, preferredEndpoint } = setup();

    await expect(
      resolveGenerationModel({
        request,
        config: CONFIG,
        dependencies: { agentBuilder },
        preferredEndpoint,
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'license' });
  });

  it('is unavailable, and says why in the log, when no model can be resolved', async () => {
    const {
      agentBuilder,
      licensing,
      getDefaultModel,
      missingIds,
      request,
      logger,
      preferredEndpoint,
    } = setup();
    missingIds.add(PREFERRED_GENERATION_ENDPOINT_ID);
    getDefaultModel.mockRejectedValue(new Error('No connector available'));

    await expect(
      resolveGenerationModel({
        request,
        config: CONFIG,
        dependencies: { agentBuilder, licensing },
        preferredEndpoint,
        logger,
      })
    ).resolves.toEqual({ available: false, reason: 'noModel' });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No connector available'));
  });
});
