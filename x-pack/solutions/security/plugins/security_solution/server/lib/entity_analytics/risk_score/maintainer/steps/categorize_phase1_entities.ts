/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategorizedEntities, ScoredEntityPage } from './pipeline_types';

export const categorizePhase1Entities = (page: ScoredEntityPage): CategorizedEntities => {
  const knownEntityIds = new Set(page.entities.keys());
  const writeNow = page.scores.filter((score) => knownEntityIds.has(score.id_value));
  const notInStore = page.scores.filter((score) => !knownEntityIds.has(score.id_value));

  return {
    // Known entities are currently persisted immediately.
    write_now: writeNow,
    not_in_store: notInStore,
    defer_to_phase_2: [],
  };
};
