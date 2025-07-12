/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';
import { AttackDiscoveries, Replacements } from '@kbn/elastic-assistant-common';

import { AttackDiscoveryAlertDocument } from '../../schedules/types';
import { generateAttackDiscoveryAlertHash } from '../transforms/transform_to_alert_documents';

interface DeduplicateAttackDiscoveriesParams {
  attackDiscoveries: AttackDiscoveries;
  connectorId: string;
  esClient: ElasticsearchClient;
  indexPattern: string;
  isSchedule: boolean;
  logger: Logger;
  ownerId: string;
  replacements: Replacements | undefined;
  spaceId: string;
}

export const deduplicateAttackDiscoveries = async ({
  attackDiscoveries,
  connectorId,
  esClient,
  indexPattern,
  isSchedule,
  logger,
  ownerId,
  replacements,
  spaceId,
}: DeduplicateAttackDiscoveriesParams): Promise<AttackDiscoveries> => {
  if (!attackDiscoveries || attackDiscoveries.length === 0) {
    return attackDiscoveries;
  }

  // 1. Transform all attackDiscoveries to alert documents and collect alertUuids
  const alertDocs = attackDiscoveries.map((attack) => {
    const alertHash = generateAttackDiscoveryAlertHash({
      attackDiscovery: attack,
      connectorId,
      ownerId,
      replacements,
      spaceId,
    });
    return { attack, alertHash };
  });
  const alertUuids = alertDocs.map((doc) => doc.alertHash);

  // 2. Search for existing alerts in ES
  const searchResult = await esClient.search<AttackDiscoveryAlertDocument>({
    index: indexPattern,
    size: alertUuids.length,
    query: { bool: { must: [{ terms: { [ALERT_INSTANCE_ID]: alertUuids } }] } },
    ignore_unavailable: true,
  });

  // 3. Collect found alert IDs
  const foundIds = new Set(
    searchResult.hits.hits.map((hit) => hit._source && hit._source[ALERT_INSTANCE_ID])
  );

  // 4. Filter out duplicates
  const newDiscoveries = alertDocs
    .filter((doc) => !foundIds.has(doc.alertHash))
    .map((doc) => doc.attack);

  const numDuplicates = attackDiscoveries.length - newDiscoveries.length;
  if (numDuplicates > 0) {
    const logPrefix = isSchedule ? 'Attack Discovery Schedule' : 'Ad-hoc Attack Discovery';
    logger.info(
      `${logPrefix}: Found ${numDuplicates} duplicate alert(s), skipping report for those.`
    );
    logger.debug(
      () => `${logPrefix}: Duplicated alerts:\n ${JSON.stringify([...foundIds].sort(), null, 2)}`
    );
  }

  return newDiscoveries;
};
