/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-security';
import { SEEDED_MITRE_FRAMEWORK_VERSION, SEEDED_MITRE_INDEX } from '../fixtures/mitre_fixtures';
import {
  createSystemIndicesEsClient,
  deleteSystemIndicesEsUser,
} from '../fixtures/system_indices_es_client';

/**
 * Removes the synthetic MITRE fixture entities seeded by global.setup.ts.
 * Only deletes documents at framework_version 99.0 so real populated data
 * (from any bundled MITRE artifact) is untouched.
 */
globalTeardownHook(
  `Remove synthetic MITRE entities (version ${SEEDED_MITRE_FRAMEWORK_VERSION})`,
  async ({ esClient, config, log }) => {
    log.info(
      `[managed-mitre teardown] Deleting framework_version ${SEEDED_MITRE_FRAMEWORK_VERSION} entities from ${SEEDED_MITRE_INDEX}`
    );

    const seederClient = await createSystemIndicesEsClient(esClient, config);
    try {
      const result = await seederClient.deleteByQuery({
        index: SEEDED_MITRE_INDEX,
        refresh: true,
        query: {
          bool: {
            must: [
              { term: { type: 'mitre-attack-entity' } },
              {
                term: {
                  'mitre-attack-entity.framework_version': SEEDED_MITRE_FRAMEWORK_VERSION,
                },
              },
            ],
          },
        },
      });

      // Assert a non-zero deletion count so silent cleanup failures are visible.
      // If setup ran correctly and seeded 5 entities, teardown must delete at least 5.
      if ((result.deleted ?? 0) === 0) {
        throw new Error(
          '[managed-mitre teardown] deleteByQuery removed 0 documents — seeded entities may not have been present or cleanup silently failed'
        );
      }

      await deleteSystemIndicesEsUser(esClient);

      log.info(`[managed-mitre teardown] Deleted ${result.deleted} synthetic MITRE entities`);
    } finally {
      await seederClient.close();
    }
  }
);
