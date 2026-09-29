/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY } from '@kbn/management-settings-ids';
import { resolveNightshiftModel, type NightshiftModelRestriction } from '@kbn/nightshift-ai';
import type { NightshiftModelStep } from '@kbn/significant-events-schema';

export type NightshiftModelCoreServices = Pick<CoreStart, 'savedObjects' | 'uiSettings'>;

export const getNightshiftModelRestriction = async ({
  request,
  inference,
  savedObjects,
  uiSettings,
}: {
  request: KibanaRequest;
  inference: InferenceServerStart;
} & NightshiftModelCoreServices): Promise<NightshiftModelRestriction> => {
  const savedObjectsClient = savedObjects.getScopedClient(request);
  const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
  const defaultOnly = await uiSettingsClient.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    { request }
  );

  if (!defaultOnly) {
    return { defaultOnly: false };
  }

  const defaultConnector = await inference.getDefaultConnector(request);
  return {
    defaultOnly: true,
    defaultConnectorId: defaultConnector?.connectorId,
  };
};

export const resolveNightshiftModelForRequest = async ({
  request,
  inference,
  savedObjects,
  uiSettings,
  step,
  requestedId,
  roundConnectorId,
  onFallback,
}: {
  request: KibanaRequest;
  inference: InferenceServerStart;
  step: NightshiftModelStep;
  requestedId?: string;
  roundConnectorId?: string;
  onFallback?: (reason: Error) => void;
} & NightshiftModelCoreServices): Promise<string> => {
  return resolveNightshiftModel({
    step,
    requestedId,
    roundConnectorId,
    validateConnector: async (connectorId) => ({
      connectorId: (await inference.getConnectorById(connectorId, request)).connectorId,
    }),
    getModelRestriction: () =>
      getNightshiftModelRestriction({
        request,
        inference,
        savedObjects,
        uiSettings,
      }),
    onFallback,
  });
};
