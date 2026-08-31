/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DiscoveryWithAlertIds } from '@kbn/discoveries/impl/attack_discovery/hallucination_detection';
import {
  filterHallucinatedAlerts,
  getAlertIds,
} from '@kbn/discoveries/impl/attack_discovery/hallucination_detection';

export interface FilterResult<T> {
  filteredCount: number;
  filterReason?: string;
  shouldValidate: boolean;
  validDiscoveries: T[];
}

export const filterAndValidateDiscoveries = async <T extends DiscoveryWithAlertIds>({
  alertsIndexPattern,
  attackDiscoveries,
  contextLogger,
  esClient,
  generationUuid,
  logger,
}: {
  alertsIndexPattern: string;
  attackDiscoveries: T[] | null | undefined;
  contextLogger: { info: (message: string) => void };
  esClient: ElasticsearchClient;
  generationUuid: string;
  logger: Logger;
}): Promise<FilterResult<T>> => {
  logger.info(
    `[VALIDATE][FILTER] Input: attackDiscoveries=${
      attackDiscoveries?.length ?? 'null'
    }, alertsIndexPattern=${alertsIndexPattern}`
  );

  if (!attackDiscoveries || attackDiscoveries.length === 0) {
    const message = 'No attack discoveries to validate';
    contextLogger.info(message);
    logger.warn(`[VALIDATE][FILTER] ${message}`);

    return {
      filteredCount: 0,
      filterReason: 'no_discoveries',
      shouldValidate: false,
      validDiscoveries: [] as T[],
    };
  }

  logger.info(
    `[VALIDATE][FILTER] Filtering ${attackDiscoveries.length} discoveries against alertsIndexPattern: ${alertsIndexPattern}`
  );

  const verifiableDiscoveries = attackDiscoveries.filter(
    (discovery) => getAlertIds(discovery).length > 0
  );
  const unverifiableDiscoveries = attackDiscoveries.filter(
    (discovery) => getAlertIds(discovery).length === 0
  );

  if (verifiableDiscoveries.length === 0) {
    logger.warn(
      '[VALIDATE][FILTER] Skipping hallucination detection because all discoveries have empty alert IDs'
    );
    return {
      filteredCount: 0,
      shouldValidate: true,
      validDiscoveries: attackDiscoveries,
    };
  }

  if (unverifiableDiscoveries.length > 0) {
    logger.info(
      `[VALIDATE][FILTER] ${unverifiableDiscoveries.length} unverifiable discovery(ies) will bypass hallucination detection`
    );
  }

  const validVerifiableDiscoveries = await filterHallucinatedAlerts({
    alertsIndexPattern,
    attackDiscoveries: verifiableDiscoveries,
    esClient,
    logger,
  });

  const validDiscoveries = [...validVerifiableDiscoveries, ...unverifiableDiscoveries];
  const filteredCount = attackDiscoveries.length - validDiscoveries.length;

  logger.info(
    `[VALIDATE][FILTER] After hallucination filter: ${validDiscoveries.length}/${attackDiscoveries.length} discoveries remain (${validVerifiableDiscoveries.length} verified + ${unverifiableDiscoveries.length} unverifiable)`
  );

  if (validDiscoveries.length === 0) {
    const message = 'All attack discoveries were filtered out due to hallucinated alert IDs';
    contextLogger.info(message);
    logger.warn(`[VALIDATE][FILTER] ${message}`);

    const alertIds = attackDiscoveries.flatMap((d) => getAlertIds(d)).slice(0, 10);
    logger.warn(`[VALIDATE][FILTER] Sample filtered alert IDs: ${JSON.stringify(alertIds)}`);

    return {
      filteredCount,
      filterReason: 'hallucinated_alert_ids',
      shouldValidate: false,
      validDiscoveries: [] as T[],
    };
  }

  return {
    filteredCount,
    ...(filteredCount > 0 ? { filterReason: 'hallucinated_alert_ids' } : {}),
    shouldValidate: true,
    validDiscoveries,
  };
};
