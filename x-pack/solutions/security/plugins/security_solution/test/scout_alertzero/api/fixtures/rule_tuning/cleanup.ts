/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, EsClient } from '@kbn/scout-security';
import { deleteSpaceAlertsIndex, runCleanupSteps } from '../helpers';
import type { RuleTuningSpaceArgs } from './common';
import { cancelReviews } from './review';
import { deleteServiceAccount, setRuleTuningWorker } from './setup';

/** Removes what a review case created, running every step even when an earlier one fails. */
export const cleanUpReviewCase = ({
  apiClient,
  apiServices,
  esClient,
  headers,
  spaceId,
  serviceAccountId,
  eventsIndex,
}: RuleTuningSpaceArgs & {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  /** Set once the case created them. */
  serviceAccountId?: string;
  eventsIndex?: string;
}): Promise<void> => {
  const space = { apiClient, headers, spaceId };
  return runCleanupSteps([
    { name: 'cancel the reviews', run: () => cancelReviews(space) },
    {
      name: 'disable the rule tuning worker',
      run: () => setRuleTuningWorker({ ...space, enabled: false }),
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
      name: 'delete the space alerts index',
      run: () => deleteSpaceAlertsIndex(esClient, spaceId),
    },
    {
      name: 'delete the source events',
      run: async () => {
        if (eventsIndex) {
          await esClient.indices.deleteDataStream({ name: eventsIndex }, { ignore: [404] });
        }
      },
    },
  ]);
};
