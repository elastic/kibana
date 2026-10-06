/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import {
  NightshiftModelBlockedError,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import { createOptimizeModel } from './create_optimize_model';

jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: jest.fn(),
}));

describe('createOptimizeModel', () => {
  const request = { headers: {} } as never;
  const inference = {} as never;
  const savedObjects = {} as never;
  const uiSettings = {} as never;
  const scopedModel = {
    inferenceClient: { output: jest.fn() },
    connector: { connectorId: 'resolved-model' },
  };
  const getDefaultModel = jest.fn();
  const createModelProvider = jest.fn();
  const agentBuilder = { runtime: { createModelProvider } } as never;
  const resolveModel = jest.mocked(resolveNightshiftModelForRequest);
  let logger: ReturnType<typeof loggerMock.create>;

  const run = (overrides: Partial<Parameters<typeof createOptimizeModel>[0]> = {}) =>
    createOptimizeModel({
      request,
      requestedConnectorId: 'manual-model',
      roundConnectorId: 'round-model',
      agentBuilder,
      inference,
      savedObjects,
      uiSettings,
      logger,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    resolveModel.mockResolvedValue('resolved-model');
    getDefaultModel.mockResolvedValue(scopedModel);
    createModelProvider.mockReturnValue({ getDefaultModel });
  });

  it('loads the model the Nightshift resolver picks, with the usage tags', async () => {
    const telemetryMetadata = { pluginId: 'usage-id', interactionId: 'execution-1' };

    await expect(run({ telemetryMetadata })).resolves.toBe(scopedModel);

    expect(resolveModel).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        step: 'investigation',
        requestedId: 'manual-model',
        roundConnectorId: 'round-model',
      })
    );
    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: 'resolved-model',
      telemetryMetadata,
    });
  });

  it('warns when the round model is gone and the resolver falls back', async () => {
    resolveModel.mockImplementation(async ({ onFallback }) => {
      onFallback?.(new Error('round model not found'));
      return 'nightshift-default';
    });

    await run();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('round model not found'));
    expect(createModelProvider).toHaveBeenCalledWith(
      expect.objectContaining({ defaultConnectorId: 'nightshift-default' })
    );
  });

  it('fails loudly when the "Default connector only" setting blocks the model', async () => {
    const blocked = new NightshiftModelBlockedError('manual-model', 'platform-default');
    resolveModel.mockRejectedValue(blocked);

    await expect(run()).rejects.toBe(blocked);
    expect(logger.error).toHaveBeenCalledWith(blocked);
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('rethrows an unknown strict model', async () => {
    const notFound = new NightshiftModelNotFoundError('manual-model');
    resolveModel.mockRejectedValue(notFound);

    await expect(run()).rejects.toBe(notFound);
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('fails instead of skipping when Agent Builder cannot load the resolved model', async () => {
    getDefaultModel.mockRejectedValue(new Error('No connector available'));

    await expect(run()).rejects.toThrow('No connector available');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('resolved-model'));
  });

  it('skips without resolving when a required plugin is missing', async () => {
    await expect(run({ agentBuilder: undefined })).resolves.toBeUndefined();
    await expect(run({ inference: undefined })).resolves.toBeUndefined();

    expect(resolveModel).not.toHaveBeenCalled();
    expect(createModelProvider).not.toHaveBeenCalled();
  });
});
