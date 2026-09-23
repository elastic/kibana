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

      // deleteByQuery throws on a real failure, so zero deletions just means the
      // entities were not there — warn rather than fail, so a setup failure is not
      // buried under a teardown error.
      if ((result.deleted ?? 0) === 0) {
        log.warning(
          '[managed-mitre teardown] deleteByQuery removed 0 documents. Seeded entities were not present (setup may have failed)'
        );
      } else {
        log.info(`[managed-mitre teardown] Deleted ${result.deleted} synthetic MITRE entities`);
      }
    } finally {
      // Must run even if the delete throws: the seeder account carries `all` privileges
      // on the saved-objects index and would otherwise outlive the suite.
      await deleteSystemIndicesEsUser(esClient);
      await seederClient.close();
    }
  }
);
