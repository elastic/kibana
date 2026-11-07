/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AIConnector } from '@kbn/inference-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';

/**
 * The Feature Settings / Security AI settings default connector is a platform
 * concept: the `genAiSettings:defaultAIConnector` advanced setting stores the
 * connector id an administrator picked as the default AI model. This is the same
 * source of truth the Elastic AI Assistant resolves via
 * `getDefaultConnector(connectors, settings)`. We read it directly here so the
 * precedence stays a pure, unit-testable function.
 */

export interface ResolveDefaultAiConnectorIdArgs {
  /** Connectors resolved for the feature, ordered by the server (Feature Settings). */
  connectors: AIConnector[] | undefined;
  /** Connector id from the `genAiSettings:defaultAIConnector` setting, if configured. */
  configuredDefaultConnectorId: string | undefined;
  /** Connector id the user last picked in onboarding, persisted per space. */
  storedConnectorId: string | undefined;
  /** Whether a concrete space id is known (stored id is per-space). */
  hasSpaceId: boolean;
}

/**
 * Resolves the connector id to use for Entity Intelligence AI features, honoring
 * precedence: Kibana's configured default connector first, then the user's stored
 * assistant connector, then the first available connector. Returns `''` when none
 * can be resolved.
 *
 * A connector is only eligible if it is present in the resolved connector list and
 * is not missing secrets, mirroring the Elastic AI Assistant's `getDefaultConnector`.
 */
export const resolveDefaultAiConnectorId = ({
  connectors,
  configuredDefaultConnectorId,
  storedConnectorId,
  hasSpaceId,
}: ResolveDefaultAiConnectorIdArgs): string => {
  const validConnectors = connectors?.filter((connector) => !connector.isMissingSecrets);
  if (!validConnectors?.length) {
    return '';
  }

  const configuredDefault = configuredDefaultConnectorId
    ? validConnectors.find((connector) => connector.id === configuredDefaultConnectorId)
    : undefined;
  if (configuredDefault) {
    return configuredDefault.id;
  }

  const storedConnector = hasSpaceId
    ? validConnectors.find((connector) => connector.id === storedConnectorId)
    : undefined;
  if (storedConnector) {
    return storedConnector.id;
  }

  return validConnectors[0]?.id ?? '';
};

export interface UseDefaultAiConnectorResult {
  /** Resolved connector id ('' when none is configured). */
  connectorId: string;
  /** Human-readable connector name for provenance ('' when none is configured). */
  connectorName: string;
  hasConnector: boolean;
  /** True while the connector list is still loading. */
  isLoading: boolean;
}

/**
 * Shared connector resolver for all Entity Intelligence AI features (Executive
 * Brief, AI Hunt, Explain-this, Use Cases, AI intelligence panel). Ensures they
 * all honor Kibana's configured default AI connector instead of silently falling
 * back to the first available / last-used connector.
 */
export const useDefaultAiConnector = (): UseDefaultAiConnectorResult => {
  const { http, settings } = useKibana().services;
  const spaceId = useSpaceId();
  const resolvedSpaceId = spaceId ?? 'default';

  const { data: availableConnectors, isLoading } = useLoadConnectors({
    http,
    featureId: 'lead_generation',
  });
  const [storedConnectorId] = useStoredAssistantConnectorId(resolvedSpaceId);
  const configuredDefaultConnectorId = settings.client.get<string | undefined>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
    undefined
  );

  const connectorId = useMemo(
    () =>
      resolveDefaultAiConnectorId({
        connectors: availableConnectors,
        configuredDefaultConnectorId,
        storedConnectorId,
        hasSpaceId: Boolean(spaceId),
      }),
    [availableConnectors, configuredDefaultConnectorId, storedConnectorId, spaceId]
  );

  const connectorName = useMemo(
    () => availableConnectors?.find((connector) => connector.id === connectorId)?.name ?? '',
    [availableConnectors, connectorId]
  );

  return { connectorId, connectorName, hasConnector: connectorId !== '', isLoading };
};
