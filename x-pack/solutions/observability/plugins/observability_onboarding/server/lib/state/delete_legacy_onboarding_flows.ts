/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingInternalRepository } from './flow_ownership';

const LEGACY_FLOW_FILTER = `not ${OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE}.attributes.createdBy: *`;
const PER_PAGE = 1000;

/**
 * Deletes onboarding flows created before flow ownership was introduced (#276743). Those flows
 * have no `createdBy`, so the fail-closed ownership check hides them from everyone forever.
 * Self-extinguishing: stops at the first empty page, so once the orphans are gone the
 * steady-state cost is a single filtered find per startup. Remove this once every branch that
 * ever wrote ownerless flows is out of maintenance.
 *
 * Release constraint: must not ship in the release that first delivers #276743 on a branch.
 * During a mixed-version rollout old nodes still create flows without `createdBy` that this
 * sweep would delete while they are in use, and the KQL filter requires the `createdBy` mapping
 * to already be applied to the index.
 */
export async function deleteLegacyOnboardingFlows({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}): Promise<void> {
  try {
    const repository = createObservabilityOnboardingInternalRepository(coreStart);
    let totalDeleted = 0;

    while (true) {
      // Always page 1: deletions (by this node or a concurrent one) shrink the filtered
      // result set, so re-querying the first page never skips documents.
      const { saved_objects: savedObjects } = await repository.find({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
        filter: LEGACY_FLOW_FILTER,
        page: 1,
        perPage: PER_PAGE,
        sortField: 'created_at',
        sortOrder: 'asc',
        // An empty fields array is treated as unspecified and would fetch all attributes,
        // so request the smallest attribute instead. Only the ids are used.
        fields: ['type'],
      });

      if (savedObjects.length === 0) {
        break;
      }

      // The loop's termination depends on deletions being visible to the next find.
      const { statuses } = await repository.bulkDelete(
        savedObjects.map(({ id }) => ({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id,
        })),
        { refresh: 'wait_for' }
      );

      let deletedThisIteration = 0;
      let progressThisIteration = 0;
      for (const status of statuses) {
        if (status.success) {
          deletedThisIteration++;
          progressThisIteration++;
        } else if (status.error?.statusCode === 404) {
          // A concurrent node already deleted the document. Not deleted by this node,
          // but the filtered result set shrank, so the loop is progressing.
          progressThisIteration++;
        } else {
          logger.warn(
            `Failed to delete legacy onboarding flow [${status.id}]: ${status.error?.message}`
          );
        }
      }

      totalDeleted += deletedThisIteration;

      if (progressThisIteration === 0) {
        logger.warn('Legacy onboarding flow cleanup made no progress, stopping');
        break;
      }
    }

    if (totalDeleted > 0) {
      logger.info(`Deleted ${totalDeleted} legacy onboarding flow(s) without an owner`);
    }
  } catch (error) {
    logger.error(`Failed to clean up legacy onboarding flows: ${error}`);
  }
}
