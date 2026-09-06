/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE, buildSoId } from '@kbn/security-mitre-attack-common';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

const SO_BASE_FIELDS = {
  references: [],
  coreMigrationVersion: '8.6.0',
  updated_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
};

/**
 * Bulk-seeds an array of typed MitreEntity documents directly into the SO index.
 * Each entity is wrapped in the Kibana SO doc shape and indexed with the
 * deterministic _id the plugin would assign.
 */
export const seedMitreEntities = async (es: Client, entities: MitreEntity[]): Promise<void> => {
  const response = await es.bulk({
    refresh: true,
    operations: entities.flatMap((entity) => [
      {
        index: {
          _index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
          // The SO repository adds a "type:" prefix to SO ids at write time; tests
          // bypass the repository, so we replicate the prefix here.
          _id: `${MITRE_ATTACK_ENTITY_SO_TYPE}:${buildSoId({
            framework: entity.framework,
            frameworkVersion: entity.framework_version,
            id: entity.id,
          })}`,
        },
      },
      {
        type: MITRE_ATTACK_ENTITY_SO_TYPE,
        [MITRE_ATTACK_ENTITY_SO_TYPE]: entity,
        ...SO_BASE_FIELDS,
      },
    ]),
  });

  if (response.errors) {
    throw new Error(
      `Unable to bulk-seed MITRE entities. Response items: ${JSON.stringify(response.items)}`
    );
  }
};
