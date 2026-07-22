/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { HUNT_FINDING_DEPLOY_API_PATH } from '../../../../../common/threat_intelligence/hub';

export interface MarkHuntFindingDeployedResult {
  finding_id: string;
  status: 'deployed';
  deployed_rule_id: string;
  deployed_at: string;
}

/**
 * Persists Detection Engine rule linkage onto a hunt finding document.
 */
export const markHuntFindingDeployed = async (
  http: CoreStart['http'],
  findingId: string,
  ruleId: string
): Promise<MarkHuntFindingDeployedResult> => {
  return http.post<MarkHuntFindingDeployedResult>(
    HUNT_FINDING_DEPLOY_API_PATH.replace('{findingId}', encodeURIComponent(findingId)),
    {
      body: JSON.stringify({ rule_id: ruleId }),
      version: '2023-10-31',
    }
  );
};
