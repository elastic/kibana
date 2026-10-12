/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Preferred EIS model when no default AI connector is configured. */
export const PREFERRED_CONNECTOR_ID = '.anthropic-claude-5-sonnet-chat_completion';

interface ConnectorLike {
  id: string;
  actionTypeId?: string;
}

/**
 * Default connector order: the stored/default AI connector, then the preferred EIS Sonnet
 * connector, then the first `.inference` connector, then the first connector of any type.
 */
export const pickDefaultConnector = <T extends ConnectorLike>(
  connectors: readonly T[],
  defaultConnectorId?: string
): T | undefined =>
  connectors.find(({ id }) => defaultConnectorId !== undefined && id === defaultConnectorId) ??
  connectors.find(({ id }) => id === PREFERRED_CONNECTOR_ID) ??
  connectors.find(({ actionTypeId }) => actionTypeId === '.inference') ??
  connectors[0];
