/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { UseLoadConnectorsResult } from '@kbn/inference-connectors';

/** Scopes the connector list to the inference endpoints relevant to Attack Discovery. */
const ATTACK_DISCOVERY_FEATURE_ID = 'attack_discovery';

/**
 * Loads the AI connectors offered for Attack Discovery. Backed by the shared
 * `@kbn/inference-connectors` hook, which needs only `http` (no triggers-actions-ui or Assistant
 * context) and reuses the app's existing react-query client.
 */
export const useAdConnectors = (): UseLoadConnectorsResult => {
  const { services } = useKibana<CoreStart>();
  return useLoadConnectors({
    http: services.http,
    toasts: services.notifications.toasts,
    featureId: ATTACK_DISCOVERY_FEATURE_ID,
  });
};
