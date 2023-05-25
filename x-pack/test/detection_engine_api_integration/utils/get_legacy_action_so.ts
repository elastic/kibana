/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectReference } from '@kbn/core/server';
import type { LegacyRuleActions } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_actions_legacy';

interface LegacyActionSO extends LegacyRuleActions {
  references: SavedObjectReference[];
}

/**
 * Fetch all legacy action sidecar SOs from the security solution savedObjects index
 * @param es The ElasticSearch service
 */
export const getLegacyActionSO = async (es: Client): Promise<SearchResponse<LegacyActionSO>> =>
  es.search({
    index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    q: 'type:siem-detection-engine-rule-actions',
  });
