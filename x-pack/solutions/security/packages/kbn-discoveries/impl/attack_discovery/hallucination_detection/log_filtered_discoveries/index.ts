/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DiscoveryWithAlertIds } from '../types';
import { getAlertIds } from '../types';

/**
 * Logs information about filtered attack discoveries with hallucinated alert IDs.
 *
 * @param allDiscoveries - The original array of all attack discoveries
 * @param validDiscoveries - The filtered array of valid discoveries
 * @param existingAlertIds - Set of alert IDs that actually exist in Elasticsearch
 */
export const logFilteredDiscoveries = <T extends DiscoveryWithAlertIds>(
  logger: Logger,
  allDiscoveries: T[],
  validDiscoveries: T[],
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
    const alertIds = getAlertIds(discovery);
    const hallucinatedIds = alertIds.filter((alertId) => !existingAlertIds.has(alertId));
    logger.debug(
      () =>
        `Attack discovery: Filtered discovery "${discovery.title}" with ${
          hallucinatedIds.length
        } hallucinated alert ID(s): ${JSON.stringify(hallucinatedIds)}`
    );
  });
};
