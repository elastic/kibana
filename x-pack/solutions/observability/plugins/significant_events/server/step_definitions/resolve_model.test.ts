/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  MAX_ID_LENGTH,
  NIGHTSHIFT_DEFAULT_MODELS,
  type NightshiftModelStep,
} from '@kbn/significant-events-schema';
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

const definition = resolveModelStepDefinition({
  getInference: () => inference,
  getSavedObjects: () => savedObjects,
  getUiSettings: () => uiSettings,
  logger: loggerMock.create(),
});

const createContext = (input: { step: NightshiftModelStep; connector_id?: string }) =>
  ({
    input,
    rawInput: input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
    },
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
});

it('resolves the discovery default', async () => {
  await expect(definition.handler(createContext({ step: 'discovery' }))).resolves.toEqual({
    output: { connector_id: NIGHTSHIFT_DEFAULT_MODELS.discovery },
  });
  expect(getConnectorById).toHaveBeenCalledWith(NIGHTSHIFT_DEFAULT_MODELS.discovery, request);
});

it('bounds connector IDs', () => {
  expect(
    definition.inputSchema.safeParse({
      step: 'discovery',
      connector_id: 'x'.repeat(MAX_ID_LENGTH + 1),
    }).success
  ).toBe(false);
});
