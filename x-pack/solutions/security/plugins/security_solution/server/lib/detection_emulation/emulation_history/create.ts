/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { emulationReportTypeName, type EmulationReportAttributes } from '../emulation_report_type';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CreateEmulationHistoryInput {
  attributes: EmulationReportAttributes;
}

export interface CreateEmulationHistoryDeps {
  /**
   * Must be the internal (hidden-type-aware) SO client variant.
   * Regular request-scoped clients cannot access hidden types.
   */
  soClient: SavedObjectsClientContract;
}

export interface CreateEmulationHistoryResult {
  id: string;
  /** False when an existing report with the same (scenarioFingerprint, ruleId) was found. */
  created: boolean;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Writes a `detection-emulation-report` saved object, deduplicating on
 * `(scenarioFingerprint, ruleId)`. The SO client is already namespace-scoped
 * to the current space, so `spaceId` does not need to appear in the filter.
 *
 * Returns the existing SO ID when a duplicate is found rather than creating
 * a second record for the same scenario re-run.
 */
export const createEmulationHistory = async (
  input: CreateEmulationHistoryInput,
  deps: CreateEmulationHistoryDeps
): Promise<CreateEmulationHistoryResult> => {
  const { attributes } = input;
  const { soClient } = deps;

  // Deduplication: exact match on both fields using KQL AND.
  // scenarioFingerprint is a sha256 hex string; ruleId is a UUID-style string —
  // neither contains KQL special characters.
  const existing = await soClient.find<EmulationReportAttributes>({
    type: emulationReportTypeName,
    filter:
      `${emulationReportTypeName}.attributes.scenarioFingerprint:"${attributes.scenarioFingerprint}"` +
      ` AND ${emulationReportTypeName}.attributes.ruleId:"${attributes.ruleId}"`,
    perPage: 1,
    sortField: 'startedAt',
    sortOrder: 'desc',
  });

  const hit = existing.saved_objects[0];
  if (hit) {
    return { id: hit.id, created: false };
  }

  const result = await soClient.create<EmulationReportAttributes>(
    emulationReportTypeName,
    attributes
  );

  return { id: result.id, created: true };
};
