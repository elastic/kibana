/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INFERENCE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/inference/constants';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { elasticModelIds } from '@kbn/inference-common';

export const isEISConnector = (connector: Connector) => {
  if (connector.actionTypeId !== INFERENCE_CONNECTOR_ID) return false;
  const modelId = connector.config?.providerConfig?.model_id ?? undefined;
  if (modelId === elasticModelIds.RainbowSprinkles) {
    return true;
  }
  return false;
};
