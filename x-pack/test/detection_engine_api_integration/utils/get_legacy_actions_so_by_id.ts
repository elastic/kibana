/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SavedObjectReference } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { LegacyRuleActions } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_actions/legacy_types';

interface LegacyActionSO extends LegacyRuleActions {
  references: SavedObjectReference[];
}

/**
 * Fetch legacy action sidecar SOs from the .kibana index
 * @param es The ElasticSearch service
 * @param id SO id
 */
export const getLegacyActionSOById = async (
  es: Client,
  id: string
): Promise<SearchResponse<LegacyActionSO>> =>
  es.search({
    index: '.kibana',
    q: `type:siem-detection-engine-rule-actions AND _id:"siem-detection-engine-rule-actions:${id}"`,
  });
