/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import {
  buildSeedBulkOperations,
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
  async ({ esClient, config, log }) => {
    log.info(
      `[managed-mitre setup] Indexing ${SEEDED_MITRE_FRAMEWORK_VERSION} fixture entities into ${SEEDED_MITRE_INDEX}`
    );

    const seederClient = await createSystemIndicesEsClient(esClient, config);
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
  }
);
