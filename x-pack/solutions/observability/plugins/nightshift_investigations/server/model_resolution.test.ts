/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY } from '@kbn/management-settings-ids';
import {
  getNightshiftModelRestriction,
  resolveNightshiftModelForRequest,
} from './model_resolution';

const request = {} as KibanaRequest;
const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
const scopedInferenceClient = { getConnectorById };
const getClient = jest.fn().mockReturnValue(scopedInferenceClient);
const getDefaultConnector = jest.fn();
const startContractGetConnectorById = jest.fn();
const inference = {
  getClient,
  getDefaultConnector,
  getConnectorById: startContractGetConnectorById,
} as unknown as InferenceServerStart;
const getSetting = jest.fn().mockResolvedValue(false);
const asScopedToClient = jest.fn().mockReturnValue({ get: getSetting });
const getScopedClient = jest.fn().mockReturnValue({});
const savedObjects = { getScopedClient } as never;
const uiSettings = { asScopedToClient } as never;

beforeEach(() => {
  jest.clearAllMocks();
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
});

it('validates with one request-scoped inference client and returns its canonical id', async () => {
  getConnectorById.mockResolvedValue({ connectorId: 'canonical-endpoint' });

  await expect(
    resolveNightshiftModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'investigation',
      requestedId: 'legacy-alias',
    })
  ).resolves.toBe('canonical-endpoint');

  expect(getClient).toHaveBeenCalledTimes(1);
  expect(getClient).toHaveBeenCalledWith({ request });
  expect(getConnectorById).toHaveBeenCalledWith('legacy-alias');
  expect(startContractGetConnectorById).not.toHaveBeenCalled();
});

it('does not load the platform default when the default-only setting is off', async () => {
  await expect(
    getNightshiftModelRestriction({
      request,
      inference,
      savedObjects,
      uiSettings,
    })
  ).resolves.toEqual({ defaultOnly: false });

  expect(getSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY, {
    request,
  });
  expect(getDefaultConnector).not.toHaveBeenCalled();
});

it('returns the canonical platform default when the restriction is on', async () => {
  getSetting.mockResolvedValue(true);
  getDefaultConnector.mockResolvedValue({ connectorId: 'canonical-default' });

  await expect(
    getNightshiftModelRestriction({
      request,
      inference,
      savedObjects,
      uiSettings,
    })
  ).resolves.toEqual({
    defaultOnly: true,
    defaultConnectorId: 'canonical-default',
  });
  expect(getDefaultConnector).toHaveBeenCalledWith(request);
});
