/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationContext,
} from '@kbn/core/server';
import { rulesV1, rulesV2, rulesV3 } from '@kbn/cloud-security-posture-common/schema/rules';

function migrateCspBenchmarkRuleToV840(
  doc: SavedObjectUnsanitizedDoc<rulesV1.CspBenchmarkRule>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<rulesV2.CspBenchmarkRule> {
  const { enabled, muted, benchmark, ...metadata } = doc.attributes;
  return {
    ...doc,
    attributes: {
      enabled,
      muted,
      metadata: {
        ...metadata,
        benchmark: { ...benchmark, id: 'cis_k8s' },
        impact: metadata.impact || undefined,
        default_value: metadata.default_value || undefined,
        references: metadata.references || undefined,
      },
    },
  };
}

function migrateCspBenchmarkRuleToV870(
  doc: SavedObjectUnsanitizedDoc<rulesV2.CspBenchmarkRule>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<rulesV3.CspBenchmarkRule> {
  // Keeps only metadata, deprecated state
  const { muted, enabled, ...attributes } = doc.attributes;

  return {
    ...doc,
    attributes: {
      metadata: {
        ...attributes.metadata,
        benchmark: {
          ...attributes.metadata.benchmark,
          // CSPM introduced in 8.7, so we can assume all docs from 8.4.0 are KSPM
          posture_type: 'kspm',
        },
      },
    },
  };
}

export const cspBenchmarkRuleMigrations: SavedObjectMigrationMap = {
  '8.4.0': migrateCspBenchmarkRuleToV840,
  '8.7.0': migrateCspBenchmarkRuleToV870,
};
