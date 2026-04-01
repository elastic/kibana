/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { fetchAnonymizationFields } from '../../attack_discovery/generation/fetch_anonymization_fields';
import { formatKeepClause } from './helpers/format_keep_clause';

const DEFAULT_SIZE = 100;

const REQUIRED_KEEP_FIELDS = ['_id', '@timestamp'] as const;

/**
 * Queries the field capabilities API to determine which of the candidate
 * fields actually exist in the given index pattern. Fields that are not
 * present in the index are logged at debug level and excluded.
 *
 * If the field caps request fails (e.g. the index does not exist yet),
 * all candidate fields are returned as-is so the query can still be built.
 */
const filterFieldsByIndex = async ({
  candidateFields,
  esClient,
  index,
  logger,
}: {
  candidateFields: string[];
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
}): Promise<string[]> => {
  if (candidateFields.length === 0) {
    return candidateFields;
  }

  try {
    const response = await esClient.fieldCaps({
      fields: candidateFields,
      index,
    });

    const existingFields = new Set(Object.keys(response.fields));

    const filtered = candidateFields.filter((field) => existingFields.has(field));

    const removed = candidateFields.filter((field) => !existingFields.has(field));
    if (removed.length > 0) {
      logger.debug(
        () =>
          `Removed ${removed.length} field(s) not found in index ${index}: ${removed.join(', ')}`
      );
    }

    return filtered;
  } catch (error) {
    logger.debug(
      () =>
        `fieldCaps request failed for index ${index}, using all candidate fields: ${
          error instanceof Error ? error.message : String(error)
        }`
    );

    return candidateFields;
  }
};

/**
 * Derives the KEEP field list by filtering anonymization fields to those
 * that are allowed, extracting their names, prepending the required
 * `_id` and `@timestamp` fields, and validating that the fields actually
 * exist in the target index.
 */
const resolveKeepFields = async ({
  allowedFields,
  esClient,
  index,
  logger,
  spaceId,
}: {
  allowedFields: string[] | undefined;
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
  spaceId: string;
}): Promise<string[]> => {
  const userFields =
    allowedFields ??
    (await fetchAnonymizationFields({ esClient, logger, spaceId }))
      .filter((field) => field.allowed)
      .map((field) => field.field);

  const deduped = [...new Set([...REQUIRED_KEEP_FIELDS, ...userFields])];

  const requiredSet = new Set<string>(REQUIRED_KEEP_FIELDS);
  const required = deduped.filter((f) => requiredSet.has(f));
  const rest = deduped.filter((f) => !requiredSet.has(f)).sort();

  const validatedRest = await filterFieldsByIndex({
    candidateFields: rest,
    esClient,
    index,
    logger,
  });

  return [...required, ...validatedRest];
};

/**
 * Builds a default ES|QL query string for retrieving security alerts.
 *
 * The query filters for open/acknowledged alerts, excludes building block
 * alerts, sorts by risk score and timestamp, and includes a KEEP clause
 * derived from either the provided `allowedFields` or the space-specific
 * anonymization field configuration.
 *
 * @param esClient - Elasticsearch client. **Must be user-scoped (`asCurrentUser`)**
 *   to ensure queries respect the calling user's permissions.
 * @param logger - Logger instance
 * @param spaceId - Kibana space ID, used to construct the default alerts index
 *   pattern and to fetch anonymization fields
 * @param allowedFields - Optional list of field names for the KEEP clause.
 *   When omitted, fields are fetched from the space's anonymization config.
 * @param size - Maximum number of alerts to retrieve (default: 100)
 * @param alertsIndexPattern - Override for the alerts index pattern
 *   (default: `.alerts-security.alerts-<spaceId>`)
 */
export const buildDefaultEsqlQuery = async ({
  alertsIndexPattern,
  allowedFields,
  esClient,
  logger,
  size = DEFAULT_SIZE,
  spaceId,
}: {
  alertsIndexPattern?: string;
  allowedFields?: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
  size?: number;
  spaceId: string;
}): Promise<string> => {
  const index = alertsIndexPattern ?? `.alerts-security.alerts-${spaceId}`;

  const keepFields = await resolveKeepFields({ allowedFields, esClient, index, logger, spaceId });

  return [
    `FROM ${index}`,
    '    METADATA _id',
    '  | WHERE @timestamp >= NOW() - 24 hours',
    '  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")',
    '  | WHERE kibana.alert.building_block_type IS NULL',
    '  | SORT kibana.alert.risk_score DESC, @timestamp DESC',
    `  | LIMIT ${size}`,
    formatKeepClause(keepFields),
  ].join('\n');
};
