/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '@kbn/security-mitre-attack-common';

/**
 * Polls the saved-object index until the expected number of mitre-attack-entity
 * documents are present (across all framework versions), or throws with a
 * descriptive timeout message. At startup only artifact docs exist, so the
 * total equals the artifact entity count.
 */
export const waitForMitrePopulation = async (
  es: Client,
  log: ToolingLog,
  expectedCount: number,
  maxTimeout = 60_000,
  timeoutWait = 250
): Promise<void> => {
  const maxTries = Math.floor(maxTimeout / timeoutWait);
  let actualCount = 0;

  for (let i = 0; i < maxTries; i++) {
    const result = await es.count({
      index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
      query: { term: { type: MITRE_ATTACK_ENTITY_SO_TYPE } },
    });
    actualCount = result.count;
    // >= is intentional: extra docs (from a partial previous run) should not hang the wait.
    // Callers that need exactness assert on exact id sets separately.
    if (actualCount >= expectedCount) return;

    log.debug(
      `waitForMitrePopulation: try ${
        i + 1
      }/${maxTries} — found ${actualCount} of ${expectedCount} mitre-attack-entity SOs`
    );
    await new Promise<void>((resolve) => setTimeout(resolve, timeoutWait));
  }

  throw new Error(
    `MITRE startup population incomplete: expected ${expectedCount} mitre-attack-entity saved objects, found ${actualCount}`
  );
};
