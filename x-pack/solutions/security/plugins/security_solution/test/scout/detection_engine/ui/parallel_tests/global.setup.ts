/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';
import { globalSetupHook } from '@kbn/scout-security';
import type {
  GetMitreEntitiesResponse,
  MitreEntity,
  MitreFramework,
} from '@kbn/security-mitre-attack-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import {
  buildSeedBulkOperations,
  SEEDED_ATLAS_ENTITIES,
  SEEDED_ATLAS_FRAMEWORK_VERSION,
  SEEDED_ENTERPRISE_ENTITIES,
  SEEDED_MITRE_FRAMEWORK_VERSION,
  SEEDED_MITRE_INDEX,
} from '../fixtures/mitre_fixtures';
import { createSystemIndicesEsClient } from '../fixtures/system_indices_es_client';

/**
 * Calls the entities route for one framework and asserts it serves exactly the
 * seeded ids for that framework: nothing missing, nothing extra. The route
 * resolves the latest version per framework, and the seeded versions (enterprise
 * 99.0, atlas 9999.0) each exceed their bundled artifact version, so each
 * response must be exactly its fixture set.
 */
const verifyFrameworkServesSeededIds = async (
  kbnClient: KbnClient,
  framework: MitreFramework,
  seededEntities: MitreEntity[]
): Promise<void> => {
  const { data } = await kbnClient.request<GetMitreEntitiesResponse>({
    method: 'GET',
    path: GET_MITRE_ENTITIES_URL,
    query: { framework },
    // Internal route requiring the versioned-API header.
    headers: { 'elastic-api-version': '1' },
  });

  if (data.framework !== framework) {
    throw new Error(
      `[managed-mitre setup] Verification failed — requested framework '${framework}' but route answered for '${data.framework}'`
    );
  }

  const returnedIds = new Set([
    ...data.tactics.map((t) => t.id),
    ...data.techniques.map((t) => t.id),
    ...data.subtechniques.map((t) => t.id),
  ]);
  const seededIds = seededEntities.map((e) => e.id);
  const missing = seededIds.filter((id) => !returnedIds.has(id));
  const extra = [...returnedIds].filter((id) => !seededIds.includes(id));

  if (missing.length > 0) {
    throw new Error(
      `[managed-mitre setup] Verification failed — route did not serve seeded ${framework} IDs: ${missing.join(
        ', '
      )}`
    );
  }

  if (extra.length > 0) {
    throw new Error(
      `[managed-mitre setup] Verification failed — route returned unexpected ${framework} IDs not in the seeded set: ${extra.join(
        ', '
      )}. Version resolution may not have selected the seeded version for '${framework}' (enterprise ${SEEDED_MITRE_FRAMEWORK_VERSION}, atlas ${SEEDED_ATLAS_FRAMEWORK_VERSION}).`
    );
  }
};

// Seeds synthetic MITRE entities (enterprise 99.0, atlas 9999.0) into
// `.kibana_security_solution` once before all workers start. Each version sorts above the
// bundled release of its framework so the managed API resolves only the seeded set for each framework.
// Seeding is global because the saved-object type is space-agnostic.
globalSetupHook(
  `Seed synthetic MITRE entities (versions ${SEEDED_MITRE_FRAMEWORK_VERSION}, ${SEEDED_ATLAS_FRAMEWORK_VERSION})`,
  async ({ esClient, kbnClient, config, log }) => {
    log.info(
      `[managed-mitre setup] Indexing ${SEEDED_MITRE_FRAMEWORK_VERSION} (enterprise) and ${SEEDED_ATLAS_FRAMEWORK_VERSION} (atlas) fixture entities into ${SEEDED_MITRE_INDEX}`
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

      // Verify the seeded data is actually served by the route, once per
      // framework. Each request exercises the same resolution path the UI uses:
      // no framework_version param, so resolveLatestVersion runs for the given
      // framework and must return the seeded version (the highest present for that framework). Confirms:
      //   1. xpack.mitreAttack.managedSourceEnabled is on and the route is registered.
      //   2. Version resolution picks the seeded version for each framework independently.
      //   3. All seeded IDs round-trip through the saved-object transform.
      //   4. No extra entities are returned — the seeded version is the only one served per
      //      framework, so each response must be exactly that framework's seeded documents
      //      (five enterprise, three atlas) and never the other framework's.
      // Without this, seeding failures surface as cryptic UI locator timeouts
      // rather than a clear setup error.
      await verifyFrameworkServesSeededIds(kbnClient, 'enterprise', SEEDED_ENTERPRISE_ENTITIES);
      await verifyFrameworkServesSeededIds(kbnClient, 'atlas', SEEDED_ATLAS_ENTITIES);

      log.info(
        `[managed-mitre setup] Verification passed — route returned exactly the ${SEEDED_ENTERPRISE_ENTITIES.length} seeded enterprise and ${SEEDED_ATLAS_ENTITIES.length} seeded atlas entities`
      );
    } finally {
      await seederClient.close();
    }
  }
);
