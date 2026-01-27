/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';

import { isMissingRequiredFields } from './is_missing_required_fields';
import type { AttackDiscoveryAlertDocument } from '../../../schedules/types';
import { transformAttackDiscoveryAlertDocumentToApi } from './transform_attack_discovery_alert_document_to_api';

interface HasNumericValue {
  value: number;
}

interface TermsAggregation {
  buckets?: Array<{
    key?: string;
    doc_count?: number;
  }>;
}

const aggregationHasValue = (aggregation: unknown): aggregation is HasNumericValue =>
  typeof aggregation === 'object' &&
  aggregation !== null &&
  'value' in aggregation &&
  typeof aggregation.value === 'number';

interface TransformSearchResponseToAlerts {
  connectorNames: string[];
  data: AttackDiscoveryApiAlert[];
  uniqueAlertIdsCount: number;
  uniqueAlertIds: string[];
}

export const transformSearchResponseToAlerts = ({
  enableFieldRendering,
  includeUniqueAlertIds = false,
  logger,
  response,
  withReplacements,
}: {
  enableFieldRendering: boolean;
  includeUniqueAlertIds?: boolean;
  logger: Logger;
  response: estypes.SearchResponse<AttackDiscoveryAlertDocument>;
  withReplacements: boolean;
}): TransformSearchResponseToAlerts => {
  const data = response.hits.hits.flatMap((hit) => {
    if (hit._source == null || isMissingRequiredFields(hit)) {
      logger.warn(
        () =>
          `Skipping Attack discovery alert document with id ${hit._id} in transformSearchResponseToAlerts because it's missing required fields.`
      );

      return []; // skip this hit
    }

    const source = hit._source;

    return transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: source,
      enableFieldRendering,
      id: hit._id ?? '',
      withReplacements,
    });
  });

  const uniqueAlertIdsCountAggregation = response.aggregations?.unique_alert_ids_count;

  const uniqueAlertIdsCount = aggregationHasValue(uniqueAlertIdsCountAggregation)
    ? uniqueAlertIdsCountAggregation.value
    : 0;

  const uniqueAttackAlertIdsAggregation: TermsAggregation | undefined = response.aggregations
    ?.all_attack_alert_ids as TermsAggregation;
  const uniqueAlertIds = includeUniqueAlertIds
    ? uniqueAttackAlertIdsAggregation?.buckets?.flatMap((bucket) => bucket.key ?? []) ?? []
    : [];

  const connectorNamesAggregation: TermsAggregation | undefined = response.aggregations
    ?.api_config_name as TermsAggregation;

  const connectorNames =
    connectorNamesAggregation?.buckets?.flatMap((bucket) => bucket.key ?? []) ?? [];

  return {
    connectorNames: [...connectorNames].sort(), // mutation
    data,
    uniqueAlertIdsCount,
    uniqueAlertIds,
  };
};
