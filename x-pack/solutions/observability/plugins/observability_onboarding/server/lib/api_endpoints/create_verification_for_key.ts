/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { createVerificationId, type VerificationStore } from './verification_store';
import type { registerCollectorWatch } from './register_collector_watch';
import { resolveTargetContext } from './resolve_target_context';

export interface ApiEndpointsWatchConfig {
  collectorWatchUrl?: string;
  kibanaToCollectorToken?: string;
  targetType?: string;
  targetId?: string;
}

export interface CreateVerificationDeps {
  store: VerificationStore;
  registerWatch: typeof registerCollectorWatch;
  logger: Logger;
}

export interface CreateVerificationInput {
  apiKeyId: string;
  endpointId: ApiEndpointId;
  apiEndpointsConfig: ApiEndpointsWatchConfig;
  cloudSetup?: {
    isServerlessEnabled?: boolean;
    deploymentId?: string;
    serverless?: { projectId?: string };
  };
}

export interface CreateVerificationResult {
  verificationId: string;
  detectionActive: boolean;
}

export const INGEST_BY_ENDPOINT: Record<ApiEndpointId, { ingestPath: string; signal?: string }> = {
  [ApiEndpointId.Elasticsearch]: { ingestPath: 'managed_es_bulk', signal: 'logs' },
  [ApiEndpointId.Prometheus]: { ingestPath: 'managed_prw', signal: 'metrics' },
  [ApiEndpointId.OpenTelemetry]: { ingestPath: 'managed_otlp' },
};

export const createVerificationForKey = async (
  deps: CreateVerificationDeps,
  input: CreateVerificationInput
): Promise<CreateVerificationResult> => {
  const { store, registerWatch, logger } = deps;
  const { apiKeyId, endpointId, apiEndpointsConfig, cloudSetup } = input;
  const { ingestPath, signal } = INGEST_BY_ENDPOINT[endpointId];
  const verificationId = createVerificationId();

  const target = resolveTargetContext({
    cloudSetup,
    config: {
      targetType: apiEndpointsConfig.targetType,
      targetId: apiEndpointsConfig.targetId,
    },
  });

  const session = store.register({
    verificationId,
    apiKeyId,
    endpointId,
    ingestPath,
    signal,
    targetType: target?.targetType,
    targetId: target?.targetId,
  });

  const { collectorWatchUrl, kibanaToCollectorToken } = apiEndpointsConfig;

  if (!target || !collectorWatchUrl || !kibanaToCollectorToken) {
    return { verificationId, detectionActive: false };
  }

  const ok = await registerWatch({
    collectorWatchUrl,
    token: kibanaToCollectorToken,
    logger,
    body: {
      targetType: target.targetType,
      targetId: target.targetId,
      apiKeyId,
      verificationId,
      endpointId,
      ingestPath,
      ...(signal !== undefined ? { signal } : {}),
      expiresAt: session.expiresAt,
    },
  });

  store.setDetectionActive(verificationId, ok);

  return { verificationId, detectionActive: ok };
};
