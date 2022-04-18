/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SavedObjectReference } from 'kibana/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { LegacyRuleActions } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_actions/legacy_types';

interface LegacyActionSO extends LegacyRuleActions {
  references: SavedObjectReference[];
}

/**
 * Fetch all legacy action sidecar notification SOs from the .kibana index
 * @param es The ElasticSearch service
 */
export const getLegacyActionNotificationSO = async (
  es: Client
): Promise<SearchResponse<LegacyActionSO>> =>
  es.search({
    index: '.kibana',
    q: 'alert.alertTypeId:siem.notifications',
  });
