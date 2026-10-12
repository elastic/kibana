/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_DEFAULT_MODELS } from '@kbn/significant-events-schema';
import { resolveModelStepDefinition } from './resolve_model';

const request = {} as KibanaRequest;
const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
const inference = {
  getConnectorById,
  getDefaultConnector: jest.fn(),
} as unknown as InferenceServerStart;
const getSetting = jest.fn().mockResolvedValue(false);
const savedObjects = { getScopedClient: jest.fn().mockReturnValue({}) } as never;
const uiSettings = {
  asScopedToClient: jest.fn().mockReturnValue({ get: getSetting }),
} as never;
const logger = loggerMock.create();

const definition = resolveModelStepDefinition({
  getInference: () => inference,
  getSavedObjects: () => savedObjects,
  getUiSettings: () => uiSettings,
  logger,
});

const createContext = (input: {
  step: 'investigation';
  connector_id?: string;
  round_connector_id?: string;
}) =>
  ({
    input,
    rawInput: input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
    },
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
});

it('resolves the investigation default', async () => {
  await expect(definition.handler(createContext({ step: 'investigation' }))).resolves.toEqual({
    output: { connector_id: NIGHTSHIFT_DEFAULT_MODELS.investigation },
  });
  expect(getConnectorById).toHaveBeenCalledWith(NIGHTSHIFT_DEFAULT_MODELS.investigation, request);
});

it('falls back from a missing round_connector_id', async () => {
  getConnectorById.mockImplementation(async (connectorId: string) => {
    if (connectorId === 'removed-round-model') {
      throw createInferenceRequestError('not found', 404);
    }
    return { connectorId };
  });

  await expect(
    definition.handler(
      createContext({
        step: 'investigation',
        round_connector_id: 'removed-round-model',
      })
    )
  ).resolves.toEqual({
    output: { connector_id: NIGHTSHIFT_DEFAULT_MODELS.investigation },
  });
  expect(logger.warn).toHaveBeenCalledWith(
    expect.stringContaining('Model "removed-round-model" was not found')
  );
});
