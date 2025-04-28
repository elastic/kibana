/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';

export const getConnectorNameFromId = ({
  aiConnectors,
  connectorId,
}: {
  aiConnectors: AIConnector[] | undefined;
  connectorId: string | undefined;
}): string | undefined => {
  if (aiConnectors == null || connectorId == null) {
    return undefined;
  }

  const connector = aiConnectors.find((c) => c.id === connectorId);

  return connector ? connector.name : undefined;
};
