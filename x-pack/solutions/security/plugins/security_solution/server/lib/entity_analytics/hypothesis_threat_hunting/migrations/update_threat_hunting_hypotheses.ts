/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { first } from 'lodash/fp';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { threatHuntingHypothesisTypeName } from '../saved_objects/threat_hunting_hypothesis_type';
import type { ThreatHuntingHypothesis } from '../types';
import type { ThreatHuntingHypothesisDescriptorClient } from '../saved_objects/threat_hunting_hypothesis_descriptor';
import { HYPOTHESES_VERSION, hypothesisDefinitions } from '../lib/hypothesis_definitions';

export const MAX_PER_PAGE = 10_000;

// Change this to a service to match the previous privmon architecture so - update_hypotheses_definitions_service.ts
// createHypothesesReconciliationService
export const updateHypothesesDefinitions = async ({
  auditLogger,
  logger,
  getStartServices,
  kibanaVersion,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const soClientKibanaUser = coreStart.savedObjects.createInternalRepository();

  // Get all installed Hypotheses Definitions
  const savedObjectsResponse = await soClientKibanaUser.find<ThreatHuntingHypothesis>({
    type: threatHuntingHypothesisTypeName,
    perPage: MAX_PER_PAGE,
    namespaces: ['*'],
  });

  await asyncForEach(savedObjectsResponse.saved_objects, async (savedObject) => {
    const namespace = first(savedObject.namespaces); // this needs to change to install one SET of Hypotheses Definitions per space and not just the first one?

    if (!namespace) {
      logger.error(
        'Unexpected saved object. Threat Hunting Hypothesis saved objects must have a namespace'
      );
      return;
    }

    // need to get default Hypotheses Definitions list from somewhere
    // const newConfig = await getDefaultThreatHuntingHypotheses({ namespace });

    logger.info(`Starting Threat Hunting Hypotheses definitions update on namespace ${namespace}`);
  });
};

export const isThreatHuntingHypothesesDefinitionsUpdateRequired = async ({
  threatHuntingHypothesisDescriptorClient,
}: {
  threatHuntingHypothesisDescriptorClient: ThreatHuntingHypothesisDescriptorClient;
}): Promise<boolean> => {
  const hypothesesSavedObjects = await threatHuntingHypothesisDescriptorClient.getAll();
  return Object.values(hypothesesSavedObjects).some(
    ({ version }) => version !== HYPOTHESES_VERSION
  );
};

export const updateThreatHuntingHypothesesDefinitions = async ({
  threatHuntingHypothesisDescriptorClient,
}: {
  threatHuntingHypothesisDescriptorClient: ThreatHuntingHypothesisDescriptorClient;
}): Promise<void> => {
  const hypothesesSavedObjects = await threatHuntingHypothesisDescriptorClient.getAll();
  // DELETE STEP
  await asyncForEach(Object.entries(hypothesesSavedObjects), async ([id, hypothesis]) => {
    if (hypothesis.version !== HYPOTHESES_VERSION) {
      // delete any out of date hypotheses
      await threatHuntingHypothesisDescriptorClient.delete(id);
    }
  });
  // UPSERT STEP
  const currentHypothesesDefinitions = hypothesisDefinitions.filter(
    (def) => def.version === HYPOTHESES_VERSION
  );
  // eslint-disable-next-line no-console
  console.log('currentHypothesesDefinitions', currentHypothesesDefinitions.length);
  const results = await threatHuntingHypothesisDescriptorClient.bulkUpsert(
    currentHypothesesDefinitions
  );
  // eslint-disable-next-line no-console
  console.log(
    `Updated Threat Hunting Hypotheses Definitions: ${results.created} created, ${results.updated} updated`
  );
};
