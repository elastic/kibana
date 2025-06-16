/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { RiskEnrichmentFields } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/enrichments/types';
import { refreshIndex } from '../refresh_index';

/**
 * Refresh an index, making changes available to search.
 * Useful for tests where we want to ensure that a rule does NOT create alerts, e.g. testing exceptions.
 * @param es The ElasticSearch handle
 */
export const getPreviewAlerts = async ({
  es,
  previewId,
  size,
  sort,
}: {
  es: Client;
  previewId: string;
  size?: number;
  sort?: string[];
}) => {
  const index = '.preview.alerts-security.alerts-*';
  await refreshIndex(es, index);
  const query = {
    bool: {
      filter: {
        term: {
          [ALERT_RULE_UUID]: previewId,
        },
      },
    },
  };
  const result = await es.search<DetectionAlert & RiskEnrichmentFields>({
    index,
    size,
    query,
    sort,
  });
  return result.hits.hits;
};
