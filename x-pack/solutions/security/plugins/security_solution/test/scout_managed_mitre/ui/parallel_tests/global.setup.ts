/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import type { GetMitreEntitiesResponse } from '@kbn/security-mitre-attack-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import {
  buildSeedBulkOperations,
  SEEDED_ENTITIES,
  SEEDED_MITRE_FRAMEWORK_VERSION,
  SEEDED_MITRE_INDEX,
} from '../fixtures/mitre_fixtures';
import { createSystemIndicesEsClient } from '../fixtures/system_indices_es_client';

/**
 * Seeds synthetic MITRE ATT&CK entities (framework_version 99.0) into
 * `.kibana_security_solution` before any test worker starts.
 *
 * Version 99.0 sorts above any real MITRE release, so the managed API
 * resolves only the seeded set when the tests run. Seeding is done once
 * globally rather than per-worker because the mitre-attack-entity saved-object
 * type is space-agnostic (`namespaceType: 'agnostic'`) and the documents are
 * visible to all spaces and all workers.
 */
globalSetupHook(
  `Seed synthetic MITRE entities (version ${SEEDED_MITRE_FRAMEWORK_VERSION})`,
  async ({ esClient, kbnClient, config, log }) => {
    log.info(
      `[managed-mitre setup] Indexing ${SEEDED_MITRE_FRAMEWORK_VERSION} fixture entities into ${SEEDED_MITRE_INDEX}`
    );

    const seederClient = await createSystemIndicesEsClient(esClient, config);
    try {
      const operations = buildSeedBulkOperations();
      const result = await seederClient.bulk({ operations, refresh: true });

      if (result.errors) {
        const failed = result.items.filter((item) => item.index?.error);
        throw new Error(
          `[managed-mitre setup] Bulk index had errors: ${JSON.stringify(failed, null, 2)}`
        );
      }

      log.info(
        `[managed-mitre setup] Successfully indexed ${result.items.length} MITRE fixture documents`
      );

      // Verify the seeded data is actually served by the route. This single check
      // confirms that:
      //   1. xpack.mitreAttack.managedSourceEnabled is on and the route is registered.
      //   2. Version resolution picked 99.0 (the highest indexed version).
      //   3. All five seeded IDs round-trip through the saved-object transform.
      // Without this, seeding failures surface as five cryptic UI locator timeouts
      // rather than a clear setup error.
      const { data } = await kbnClient.request<GetMitreEntitiesResponse>({
        method: 'GET',
        // Filter by our synthetic version so real bundled entities don't interfere.
        path: `${GET_MITRE_ENTITIES_URL}?framework_version=${SEEDED_MITRE_FRAMEWORK_VERSION}`,
        // Internal route requiring the versioned-API header.
        headers: { 'elastic-api-version': '1' },
      });

      const returnedIds = new Set([
        ...data.tactics.map((t) => t.id),
        ...data.techniques.map((t) => t.id),
        ...data.subtechniques.map((t) => t.id),
      ]);
      const missing = SEEDED_ENTITIES.map((e) => e.id).filter((id) => !returnedIds.has(id));

      if (missing.length > 0) {
        throw new Error(
          `[managed-mitre setup] Verification failed — route did not serve seeded IDs: ${missing.join(
            ', '
          )}`
        );
      }

      log.info(
        '[managed-mitre setup] Verification passed — all seeded entities are served by the route'
      );
    } finally {
      await seederClient.close();
    }
  }
);
