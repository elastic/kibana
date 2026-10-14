/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '@kbn/security-mitre-attack-common';

/**
 * Removes MITRE entity saved objects for a specific framework version.
 * Use this for cleanup after seeding a fixture version (e.g. OLDER_MOCK_FRAMEWORK_VERSION).
 */
export const deleteMitreEntitiesByVersion = async (
  es: Client,
  frameworkVersion: string
): Promise<void> => {
  await es.deleteByQuery({
    index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    refresh: true,
    query: {
      bool: {
        must: [
          { term: { type: MITRE_ATTACK_ENTITY_SO_TYPE } },
          { term: { [`${MITRE_ATTACK_ENTITY_SO_TYPE}.framework_version`]: frameworkVersion } },
        ],
      },
    },
  });
};

/**
 * Removes ALL mitre-attack-entity saved objects from the SO index.
 * Use sparingly — this is destructive and affects the running plugin instance.
 */
export const deleteAllMitreEntities = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    refresh: true,
    query: { term: { type: MITRE_ATTACK_ENTITY_SO_TYPE } },
  });
};
