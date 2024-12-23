/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import {
  OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  ObservabilityOnboardingFlow,
  SavedObservabilityOnboardingFlow,
} from '../../saved_objects/observability_onboarding_status';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  observabilityOnboardingState: ObservabilityOnboardingFlow;
  savedObjectId?: string;
}
export async function saveObservabilityOnboardingFlow({
  savedObjectsClient,
  observabilityOnboardingState,
  savedObjectId,
}: Options): Promise<SavedObservabilityOnboardingFlow> {
  let savedObject: Omit<SavedObject<ObservabilityOnboardingFlow>, 'attributes' | 'references'>;
  if (savedObjectId) {
    savedObject = await savedObjectsClient.update<ObservabilityOnboardingFlow>(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      savedObjectId,
      {
        type: observabilityOnboardingState.type,
        state: observabilityOnboardingState.state,
        progress: { ...observabilityOnboardingState.progress },
      }
    );
  } else {
    savedObject = await savedObjectsClient.create<ObservabilityOnboardingFlow>(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      observabilityOnboardingState
    );
  }
  const { id, updated_at: updatedAt } = savedObject;
  return {
    id,
    ...observabilityOnboardingState,
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
