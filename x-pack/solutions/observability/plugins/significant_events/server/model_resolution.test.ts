/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { NIGHTSHIFT_DEFAULT_MODELS } from '@kbn/significant-events-schema';
import {
  getSignificantEventsModelRestriction,
  resolveSignificantEventsModelForRequest,
} from './model_resolution';

const request = {} as KibanaRequest;
const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
const getDefaultConnector = jest.fn();
const inference = {
  getClient: jest.fn().mockReturnValue({ getConnectorById }),
  getDefaultConnector,
} as unknown as InferenceServerStart;
const getSetting = jest.fn().mockResolvedValue(false);
const savedObjects = { getScopedClient: jest.fn().mockReturnValue({}) } as never;
const uiSettings = {
  asScopedToClient: jest.fn().mockReturnValue({ get: getSetting }),
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
});

it('resolves the code-owned default through the request-scoped inference client', async () => {
  await expect(
    resolveSignificantEventsModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'kiExtraction',
    })
  ).resolves.toBe(NIGHTSHIFT_DEFAULT_MODELS.kiExtraction);

  expect(inference.getClient).toHaveBeenCalledWith({ request });
  expect(getConnectorById).toHaveBeenCalledWith(NIGHTSHIFT_DEFAULT_MODELS.kiExtraction);
});

it('returns the canonical connector ID for a strict override', async () => {
  getConnectorById.mockResolvedValue({ connectorId: 'canonical-model' });

  await expect(
    resolveSignificantEventsModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'discovery',
      requestedId: 'model-alias',
    })
  ).resolves.toBe('canonical-model');
});

it('does not load the default connector when the default-only setting is off', async () => {
  await expect(
    getSignificantEventsModelRestriction({
      request,
      inference,
      savedObjects,
      uiSettings,
    })
  ).resolves.toEqual({ defaultOnly: false });

  expect(getDefaultConnector).not.toHaveBeenCalled();
});
