/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SavedObjectReference } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { LegacyRuleNotificationAlertTypeParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/notifications/legacy_types';

interface LegacyActionNotificationSO extends LegacyRuleNotificationAlertTypeParams {
  references: SavedObjectReference[];
}

/**
 * Fetch legacy action sidecar notification SOs from the .kibana index
 * @param es The ElasticSearch service
 * @param id SO id
 */
export const getLegacyActionNotificationSOById = async (
  es: Client,
  id: string
): Promise<SearchResponse<LegacyActionNotificationSO>> =>
  es.search({
    index: '.kibana',
    q: `alert.alertTypeId:siem.notifications AND alert.params.ruleAlertId:"${id}"`,
  });
