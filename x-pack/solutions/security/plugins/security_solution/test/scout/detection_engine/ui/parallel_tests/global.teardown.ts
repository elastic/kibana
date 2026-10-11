/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-security';
import {
  SEEDED_ATLAS_FRAMEWORK_VERSION,
  SEEDED_MITRE_FRAMEWORK_VERSION,
  SEEDED_MITRE_INDEX,
  getSeededSoIds,
} from '../fixtures/mitre_fixtures';
import {
  createSystemIndicesEsClient,
  deleteSystemIndicesEsUser,
} from '../fixtures/system_indices_es_client';

/**
 * Removes the synthetic MITRE fixture entities seeded by global.setup.ts.
 * Deletes only the exact seeded documents, matched by `_id`, so real populated data
 * (from any bundled MITRE artifact) and any other document at the seeded versions
 * is untouched. Both the enterprise and the atlas fixtures are removed.
 */
globalTeardownHook(
  `Remove synthetic MITRE entities (versions ${SEEDED_MITRE_FRAMEWORK_VERSION}, ${SEEDED_ATLAS_FRAMEWORK_VERSION})`,
  async ({ esClient, config, log }) => {
    const seededSoIds = getSeededSoIds();
    log.info(
      `[managed-mitre teardown] Deleting ${seededSoIds.length} seeded entities by _id from ${SEEDED_MITRE_INDEX}`
    );

    const seederClient = await createSystemIndicesEsClient(esClient, config);
    try {
      const result = await seederClient.deleteByQuery({
        index: SEEDED_MITRE_INDEX,
        refresh: true,
        query: { ids: { values: seededSoIds } },
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
