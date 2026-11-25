/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  buildServiceAccountUrl,
  buildWorkerUrl,
  getWorkerRoleName,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  type ListWorkersResponse,
  type UpdateWorkerRequestBody,
} from '@kbn/alertzero-common';
import { spaceUrl } from '../helpers';
import { expectStatus, INTERNAL_V1_HEADERS, type RuleTuningSpaceArgs } from './common';

const SEARCH_INFERENCE_SETTINGS_PATH = 'internal/search_inference_endpoints/settings';

interface InferenceSettings {
  data?: { features?: Array<{ feature_id: string }> };
}

/** Points the space's AlertZero models at the LLM proxy and returns the connector id. */
export const pinModelToProxy = async ({
  apiClient,
  headers,
  spaceId,
  proxyPort,
}: RuleTuningSpaceArgs & { proxyPort: number }): Promise<string> => {
  const connector = await apiClient.post<{ id: string }>(
    spaceUrl('api/actions/connector', spaceId),
    {
      headers,
      responseType: 'json',
      body: {
        name: `scout-rule-tuning-proxy-${spaceId}`,
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${proxyPort}`,
          defaultModel: 'gpt-4',
        },
        secrets: { apiKey: 'scout-test-key' },
      },
    }
  );
  expectStatus('Create the proxy connector', connector);
  const { id: connectorId } = connector.body;

  // The diagnosis runs on the balanced feature. The parent feature is pinned too, so enabling the
  // worker is not blocked for lack of a model.
  const settingsUrl = spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId);
  const current = await apiClient.get<InferenceSettings>(settingsUrl, {
    headers: { ...headers, ...INTERNAL_V1_HEADERS },
    responseType: 'json',
  });
  expectStatus('Read the inference settings', current);
  const pinned = new Set<string>([
    ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
    ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ]);
  const features = (current.body.data?.features ?? []).filter(
    ({ feature_id: featureId }) => !pinned.has(featureId)
  );
  const put = await apiClient.put(settingsUrl, {
    headers: { ...headers, ...INTERNAL_V1_HEADERS },
    responseType: 'json',
    body: {
      features: [
        ...features,
        ...[...pinned].map((featureId) => ({
          feature_id: featureId,
          endpoints: [{ id: connectorId }],
        })),
      ],
    },
  });
  expectStatus('Pin the AlertZero features to the proxy connector', put);
  return connectorId;
};

/** Creates a service account with the rule tuning worker's built-in role and returns its id. */
export const createWorkerServiceAccount = async ({
  apiClient,
  headers,
  spaceId,
}: RuleTuningSpaceArgs): Promise<string> => {
  const accountName = WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID];
  const created = await apiClient.post<{ id: string }>(SECURITY_SERVICE_ACCOUNT_URL, {
    headers: { ...headers, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' },
    responseType: 'json',
    body: {
      // Unique, so a run never collides with an account that a failed run left behind.
      name: `${accountName}_scout_${randomUUID().slice(0, 8)}`.slice(0, 50),
      description: `Scout rule tuning review (${spaceId})`,
      roles: [getWorkerRoleName(accountName, { isServerless: false })],
    },
  });
  expectStatus('Create the worker service account', created);
  return created.body.id;
};

/** Deletes a service account, and succeeds when it is already gone. */
export const deleteServiceAccount = async ({
  apiClient,
  headers,
  serviceAccountId,
}: Omit<RuleTuningSpaceArgs, 'spaceId'> & { serviceAccountId: string }): Promise<void> => {
  const deleted = await apiClient.delete(`${buildServiceAccountUrl(serviceAccountId)}?force=true`, {
    headers: { ...headers, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' },
    responseType: 'json',
  });
  expectStatus('Delete the worker service account', deleted, [200, 204, 404]);
};

export const setRuleTuningWorker = async ({
  apiClient,
  headers,
  spaceId,
  enabled,
  settings,
}: RuleTuningSpaceArgs & {
  enabled: boolean;
  settings?: { serviceAccountId: string; autonomy: 'manual' | 'assisted' };
}): Promise<void> => {
  const listed = await apiClient.get<ListWorkersResponse>(
    spaceUrl(ALERTZERO_WORKERS_URL, spaceId),
    {
      headers: { ...headers, ...INTERNAL_V1_HEADERS },
      responseType: 'json',
    }
  );
  expectStatus('List the workers', listed);
  const worker = listed.body.workers.find(
    ({ id }) => id === SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  );
  const body: UpdateWorkerRequestBody = {
    enabled,
    ...(settings ? { settings, settingsRevision: worker?.settingsRevision ?? null } : {}),
  };
  // Enabling schedules the worker, and its first run starts at once.
  const patched = await apiClient.patch(
    spaceUrl(buildWorkerUrl(SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID), spaceId),
    {
      headers: { ...headers, ...INTERNAL_V1_HEADERS },
      responseType: 'json',
      body,
    }
  );
  expectStatus(`${enabled ? 'Enable' : 'Disable'} the rule tuning worker`, patched);
};
