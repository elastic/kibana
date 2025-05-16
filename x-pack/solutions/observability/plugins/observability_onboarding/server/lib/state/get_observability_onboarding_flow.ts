/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  ObservabilityOnboardingFlow,
  OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  SavedObservabilityOnboardingFlow,
} from '../../saved_objects/observability_onboarding_status';

export async function getObservabilityOnboardingFlow({
  savedObjectsClient,
  savedObjectId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectId: string;
}): Promise<SavedObservabilityOnboardingFlow | undefined> {
  try {
    const result = await savedObjectsClient.get<ObservabilityOnboardingFlow>(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      savedObjectId
    );
    const { id, updated_at: updatedAt, attributes } = result;
    return {
      id,
      updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
      ...attributes,
    };
  } catch (error) {
    return undefined;
  }
}
