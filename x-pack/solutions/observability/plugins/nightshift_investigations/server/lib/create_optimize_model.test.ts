/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createOptimizeModel } from './create_optimize_model';

describe('createOptimizeModel', () => {
  const request = { headers: {} } as never;
  const inferenceClient = { output: jest.fn() };
  const scopedModel = {
    inferenceClient,
    connector: { connectorId: 'anthropic-sonnet' },
  };
  const getDefaultModel = jest.fn();
  const createModelProvider = jest.fn();
  const agentBuilder = { runtime: { createModelProvider } } as never;

  const run = (connectorId?: string) =>
    createOptimizeModel({
      request,
      connectorId,
      agentBuilder,
      logger: loggerMock.create(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    getDefaultModel.mockResolvedValue(scopedModel);
    createModelProvider.mockReturnValue({ getDefaultModel });
  });

  it('passes the triggering agent connector into createModelProvider', async () => {
    await expect(run('anthropic-sonnet')).resolves.toBe(scopedModel);
    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: 'anthropic-sonnet',
    });
    expect(getDefaultModel).toHaveBeenCalled();
  });

  it('does not invent a catalog connector when the round did not supply one', async () => {
    await run(undefined);
    expect(createModelProvider).toHaveBeenCalledWith({ request });
    expect(createModelProvider.mock.calls[0][0]).not.toHaveProperty('defaultConnectorId');
  });

  it('treats a blank inherited connector as unset', async () => {
    await run('  ');
    expect(createModelProvider).toHaveBeenCalledWith({ request });
  });

  it('returns undefined when Agent Builder is not started', async () => {
    await expect(
      createOptimizeModel({
        request,
        connectorId: 'anthropic-sonnet',
        agentBuilder: undefined,
        logger: loggerMock.create(),
      })
    ).resolves.toBeUndefined();
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('returns undefined when getDefaultModel cannot resolve a connector', async () => {
    getDefaultModel.mockRejectedValue(new Error('No connector available'));
    await expect(run('anthropic-sonnet')).resolves.toBeUndefined();
  });
});
