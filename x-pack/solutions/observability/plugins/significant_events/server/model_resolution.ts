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

export type SignificantEventsModelCoreServices = Pick<CoreStart, 'savedObjects' | 'uiSettings'>;

export const getSignificantEventsModelRestriction = async ({
  request,
  inference,
  savedObjects,
  uiSettings,
}: {
  request: KibanaRequest;
  inference: InferenceServerStart;
} & SignificantEventsModelCoreServices): Promise<NightshiftModelRestriction> => {
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

export const resolveSignificantEventsModelForRequest = async ({
  request,
  inference,
  savedObjects,
  uiSettings,
  step,
  requestedId,
}: {
  request: KibanaRequest;
  inference: InferenceServerStart;
  step: NightshiftModelStep;
  requestedId?: string;
} & SignificantEventsModelCoreServices): Promise<string> => {
  const inferenceClient = inference.getClient({ request });

  return resolveNightshiftModel({
    step,
    requestedId,
    validateConnector: async (connectorId) => ({
      connectorId: (await inferenceClient.getConnectorById(connectorId)).connectorId,
    }),
    getModelRestriction: () =>
      getSignificantEventsModelRestriction({
        request,
        inference,
        savedObjects,
        uiSettings,
      }),
  });
};
