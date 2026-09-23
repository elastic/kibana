/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getAlertsIndex } from '@kbn/security-solution-plugin/common/entity_analytics/utils';

export interface SeedAlertOptions {
  readonly entityName: string;
  readonly entityField: 'host.name' | 'user.name' | 'service.name';
  readonly ruleName: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly mitreTactic?: string;
  readonly status?: 'open' | 'acknowledged' | 'closed';
  readonly riskScore?: number;
  readonly timestamp?: string;
}

export const seedAlert = async ({
  esClient,
  spaceId = 'default',
  entityName,
  entityField,
  ruleName,
  severity,
  mitreTactic,
  status = 'open',
  riskScore = 21,
  timestamp = new Date().toISOString(),
}: SeedAlertOptions & { esClient: Client; spaceId?: string }): Promise<void> => {
  const [identityRoot, identityField] = entityField.split('.');

  await esClient.index({
    index: getAlertsIndex(spaceId),
    refresh: 'wait_for',
    document: {
      '@timestamp': timestamp,
      [identityRoot]: { [identityField]: entityName },
      kibana: {
        alert: {
          severity,
          risk_score: riskScore,
          workflow_status: status,
          rule: {
            name: ruleName,
            ...(mitreTactic !== undefined && { threat: [{ tactic: { name: mitreTactic } }] }),
          },
        },
      },
    },
  });
};
