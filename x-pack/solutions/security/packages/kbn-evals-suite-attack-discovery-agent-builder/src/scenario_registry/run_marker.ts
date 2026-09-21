/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_SCENARIO_SEED_LABEL } from './constants';

/**
 * A seed marker that belongs to exactly ONE seeded run.
 *
 * `AD2_SCENARIO_SEED_LABEL` is a generation marker: every document this fixture
 * has ever written carries it, and the seeded `_id`s were a digest of
 * `(scenarioKey, stepNumber)` alone — so neither the marker nor the ids could
 * tell one run from another. The dense profile re-seeds the clean profile's four
 * chains verbatim (same scenario keys, same steps), so whichever spec reached
 * `afterAll` first deleted the other run's live fixture, and the survivor's
 * exact-population retrieval either short-counted or lost its four target chains
 * mid-run.
 *
 * A marker per run makes the run the sole owner of its documents: the ids
 * (`ids.ts`), the retrieval scope (`tags`) and the cleanup marker
 * (`labels.ad_portable_seed`) all name it. Isolation is then a property of the
 * fixture rather than of the scheduler — which is why the profile specs need no
 * serialization, and why raising `workers` cannot reintroduce the overlap.
 */
const createRunSuffix = (): string => {
  const stamp = Date.now().toString(36);
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${stamp}${entropy}`;
};

/**
 * `${generation marker}-${suffix}`. The generation marker stays the prefix so a
 * seeded index is still greppable as this fixture with a prefix query, and so
 * `tags` stays one keyword value a generated query can match with `==`.
 */
export const createAd2RunMarker = (suffix: string = createRunSuffix()): string =>
  `${AD2_SCENARIO_SEED_LABEL}-${suffix}`;

let processMarker: string | undefined;

/**
 * The marker of the current process, for callers that build a plan or resolve
 * reference ids without owning a run — unit tests, mostly.
 *
 * The entry points that reach a live index (`seedAd2ScenarioProfile`,
 * `cleanupAd2ScenarioProfile`, `countAd2ScenarioProfileDocuments`) require a
 * marker instead of defaulting to this one, so a run cannot be scoped by
 * accident.
 */
export const getAd2RunMarker = (): string => {
  if (processMarker === undefined) {
    processMarker = createAd2RunMarker();
  }
  return processMarker;
};
