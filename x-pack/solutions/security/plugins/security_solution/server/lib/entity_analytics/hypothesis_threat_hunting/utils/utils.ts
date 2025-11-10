/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatHuntingHypothesisDescriptorClient } from '../saved_objects/threat_hunting_hypothesis_descriptor';

/**
 * For Testing and Debugging:
 * Util to delete all Threat Hunting Hypotheses saved objects
 * @param descriptor
 */
export const deleteAll = async (
  descriptor: ThreatHuntingHypothesisDescriptorClient
): Promise<void> => {
  const hypothesesSavedObjects = await descriptor.getAll();
  await Promise.all(
    Object.entries(hypothesesSavedObjects).map(async ([id, hypothesis]) => {
      await descriptor.delete(id);
    })
  );
};
