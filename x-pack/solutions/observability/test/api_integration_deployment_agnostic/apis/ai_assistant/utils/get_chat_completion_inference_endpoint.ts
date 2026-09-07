/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

/**
 * Returns a chat_completion inference endpoint ID that is not backed by an action
 * connector saved object (EIS / native ES inference endpoints).
 */
export async function getInferenceEndpointOnlyConnectorId(
  getService: DeploymentAgnosticFtrProviderContext['getService']
): Promise<string | undefined> {
  const es = getService('es');
  const log = getService('log');

  const response = await es.inference.get();
  const endpoints = response.endpoints ?? [];

  const chatCompletionEndpoints = endpoints.filter(
    (endpoint) => endpoint.task_type === 'chat_completion'
  );

  const elasticEndpoint = chatCompletionEndpoints.find(
    (endpoint) => endpoint.service === 'elastic'
  );
  const inferenceEndpointId =
    elasticEndpoint?.inference_id ?? chatCompletionEndpoints[0]?.inference_id;

  if (!inferenceEndpointId) {
    log.warning(
      'No chat_completion inference endpoints found in the cluster; skipping inference-endpoint connector resolution tests.'
    );
    return undefined;
  }

  return inferenceEndpointId;
}
