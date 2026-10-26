/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttackDiscoveries } from '@kbn/elastic-assistant-common';

/**
 * Logs information about filtered attack discoveries with hallucinated alert IDs.
 *
 * @param allDiscoveries - The original array of all attack discoveries
 * @param validDiscoveries - The filtered array of valid discoveries
 * @param existingAlertIds - Set of alert IDs that actually exist in Elasticsearch
 */
export const logFilteredDiscoveries = (
  logger: Logger,
  allDiscoveries: AttackDiscoveries,
  validDiscoveries: AttackDiscoveries,
  existingAlertIds: Set<string>
): void => {
  const numFiltered = allDiscoveries.length - validDiscoveries.length;

  if (numFiltered === 0) {
    return;
  }

  // Log summary at info level
  logger.info(
    () => `Attack discovery: Filtered out ${numFiltered} discovery(ies) with hallucinated alert IDs`
  );

  // Log details at debug level
  const filteredDiscoveries = allDiscoveries.filter(
    (discovery) => !validDiscoveries.includes(discovery)
  );

  filteredDiscoveries.forEach((discovery) => {
    const hallucinatedIds = discovery.alertIds.filter((alertId) => !existingAlertIds.has(alertId));
    logger.debug(
      () =>
        `Attack discovery: Filtered discovery "${discovery.title}" with ${
          hallucinatedIds.length
        } hallucinated alert ID(s): ${JSON.stringify(hallucinatedIds)}`
    );
  });
};
