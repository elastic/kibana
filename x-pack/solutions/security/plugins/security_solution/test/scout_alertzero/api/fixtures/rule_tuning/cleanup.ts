/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, EsClient } from '@kbn/scout-security';
import { createDetectionsApi } from '@kbn/security-solution-test-api-clients/scout';
import { deleteSpaceAlertsIndex, runCleanupSteps } from '../helpers';
import { expectStatus, type RuleTuningSpaceArgs } from './common';
import { cancelReviews } from './review';
import { reviewEventsIndex, reviewRuleId } from './seed';
import { deleteServiceAccount, setRuleTuningWorker } from './setup';

/**
 * Removes what a review case created, running every step even when an earlier one fails. It
 * works from the names the case chose before seeding, so a failed seed still gets cleaned up.
 */
export const cleanUpReviewCase = ({
  apiClient,
  apiServices,
  esClient,
  headers,
  spaceId,
  ruleName,
  serviceAccountId,
}: RuleTuningSpaceArgs & {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  /** The name the rule is seeded under. */
  ruleName: string;
  /** Set once the case created it. */
  serviceAccountId?: string;
}): Promise<void> => {
  const space = { apiClient, headers, spaceId };
  return runCleanupSteps([
    { name: 'cancel the reviews', run: () => cancelReviews(space) },
    {
      name: 'disable the rule tuning worker',
      run: () => setRuleTuningWorker({ ...space, enabled: false }),
    },
    {
      // Deleting the space removes the rule's saved object, but not its scheduled task or API key.
      name: 'delete the seeded rule',
      run: async () => {
        const response = await createDetectionsApi(apiClient).deleteRule(
          { query: { rule_id: reviewRuleId(ruleName) } },
          { headers, kibanaSpace: spaceId }
        );
        expectStatus('Delete the seeded rule', response, [200, 404]);
      },
    },
    {
      name: 'delete the worker service account',
      run: async () => {
        if (serviceAccountId) {
          await deleteServiceAccount({ apiClient, headers, serviceAccountId });
        }
      },
    },
    { name: `delete space ${spaceId}`, run: () => apiServices.spaces.delete(spaceId) },
    {
      name: 'delete the space alerts indices',
      run: () => deleteSpaceAlertsIndex(esClient, spaceId),
    },
    {
      name: 'delete the source events',
      run: async () => {
        await esClient.indices.deleteDataStream(
          { name: reviewEventsIndex(ruleName) },
          { ignore: [404] }
        );
      },
    },
  ]);
};
