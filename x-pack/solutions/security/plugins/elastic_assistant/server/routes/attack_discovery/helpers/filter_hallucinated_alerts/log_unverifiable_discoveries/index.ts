/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttackDiscoveries } from '@kbn/elastic-assistant-common';

/**
 * Logs information about attack discoveries with empty alertIds that cannot be verified.
 *
 * @param logger - The logger instance
 * @param allDiscoveries - The original array of all attack discoveries
 * @param verifiableDiscoveries - The filtered array of discoveries with non-empty alertIds
 */
export const logUnverifiableDiscoveries = (
  logger: Logger,
  allDiscoveries: AttackDiscoveries,
  verifiableDiscoveries: AttackDiscoveries
): void => {
  const numUnverifiable = allDiscoveries.length - verifiableDiscoveries.length;

  if (numUnverifiable === 0) {
    return;
  }

  // Log summary at info level
  logger.info(
    () =>
      `Attack discovery: Filtered out ${numUnverifiable} hallucinated discovery(ies) with empty alertIds`
  );

  // Log details at debug level
  const unverifiableDiscoveries = allDiscoveries.filter(
    (discovery) => discovery.alertIds.length === 0
  );

  unverifiableDiscoveries.forEach((discovery) => {
    logger.debug(
      () => `Attack discovery: Filtered discovery "${discovery.title}" with empty alertIds`
    );
  });
};
