/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';
import type { estypes } from '@elastic/elasticsearch';
import { isMissingRequiredFields } from './is_missing_required_fields';
import { transformAttackDiscoveryAlertDocumentToApi } from './transform_attack_discovery_alert_document_to_api';

type AttackDiscoveryAlertDocument = Record<string, unknown>;

/**
 * Transform Elasticsearch search response to API alert format
 */
export const transformSearchResponseToAlerts = ({
  enableFieldRendering,
  logger,
  response,
  withReplacements,
}: {
  enableFieldRendering: boolean;
  logger: Logger;
  response: estypes.SearchResponse<AttackDiscoveryAlertDocument>;
  withReplacements: boolean;
}): AttackDiscoveryApiAlert[] => {
  return response.hits.hits.flatMap((hit) => {
    if (hit._source == null || isMissingRequiredFields(hit)) {
      logger.warn(
        `Skipping Attack discovery alert document with id ${hit._id} because it's missing required fields.`
      );
      return [];
    }

    return transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: hit._source,
      enableFieldRendering,
      id: hit._id ?? '',
      withReplacements,
    });
  });
};
