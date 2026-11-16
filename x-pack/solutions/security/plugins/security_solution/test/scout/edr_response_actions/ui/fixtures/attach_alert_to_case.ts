/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertCaseAttachment } from '@kbn/cases-plugin/common';
import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/scout-security';
import { indexCase } from '../../../../../common/endpoint/data_loaders/index_case';
import { scopeKbnClientToSpace } from '../../common/scope_kbn_client_to_space';

export const attachAlertToCase = async ({
  kbnClient,
  spaceId,
  alertId,
  ruleId,
  ruleName,
  hostname,
}: {
  kbnClient: KbnClient;
  spaceId: string;
  alertId: string;
  ruleId: string;
  ruleName: string;
  hostname: string;
}): Promise<{ caseId: string; cleanup: () => Promise<void> }> => {
  const scopedKbnClient = scopeKbnClientToSpace(kbnClient, spaceId);
  const created = await indexCase(scopedKbnClient, {
    title: `Isolate ${hostname}`,
  });

  await scopedKbnClient.request({
    method: 'POST',
    path: `/internal/cases/${created.data.id}/attachments/_bulk_create`,
    headers: {
      'kbn-xsrf': 'scout',
      ...INTERNAL_API_HEADERS,
    },
    body: [
      {
        ...buildAlertCaseAttachment('securitySolution', {
          alertId,
          index: `.alerts-security.alerts-${spaceId}`,
          rule: { id: ruleId, name: ruleName },
        }),
        owner: 'securitySolution',
      },
    ],
  });

  return {
    caseId: created.data.id,
    cleanup: async () => {
      await created.cleanup();
    },
  };
};
