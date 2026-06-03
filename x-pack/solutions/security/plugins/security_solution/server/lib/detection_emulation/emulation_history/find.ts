/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { emulationReportTypeName, type EmulationReportAttributes } from '../emulation_report_type';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FindEmulationHistoryInput {
  /** Filter to reports for a specific detection rule. Omit to list all in the space. */
  ruleId?: string;
  /**
   * Attribute-level space filter. The SO client is already namespace-scoped to
   * the current space, so this is redundant for access control but lets callers
   * that use a non-scoped client narrow results by the stored `spaceId` attribute.
   */
  spaceId?: string;
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Results per page. Defaults to 20. */
  perPage?: number;
}

export interface FindEmulationHistoryItem {
  id: string;
  attributes: EmulationReportAttributes;
}

export interface FindEmulationHistoryResult {
  items: FindEmulationHistoryItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface FindEmulationHistoryDeps {
  /**
   * Must be the internal (hidden-type-aware) SO client variant.
   * Regular request-scoped clients cannot access hidden types.
   */
  soClient: SavedObjectsClientContract;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Lists `detection-emulation-report` saved objects with optional filters on
 * `ruleId` and `spaceId`, sorted newest-first by `startedAt`.
 *
 * The SO client is already namespace-scoped to the current space, so results
 * are implicitly restricted to the caller's space even without a `spaceId`
 * filter. Both filters are optional — omitting them returns all reports in the
 * space, which is appropriate for history-listing UIs.
 *
 * Field values in the KQL filter must not contain KQL special characters.
 * `ruleId` is a UUID-style string and `spaceId` is a slug — neither does.
 */
export const findEmulationHistory = async (
  input: FindEmulationHistoryInput,
  deps: FindEmulationHistoryDeps
): Promise<FindEmulationHistoryResult> => {
  const { ruleId, spaceId, page = 1, perPage = 20 } = input;
  const { soClient } = deps;

  const filterClauses: string[] = [];

  if (ruleId) {
    filterClauses.push(`${emulationReportTypeName}.attributes.ruleId:"${ruleId}"`);
  }

  if (spaceId) {
    filterClauses.push(`${emulationReportTypeName}.attributes.spaceId:"${spaceId}"`);
  }

  const filter = filterClauses.length > 0 ? filterClauses.join(' AND ') : undefined;

  const result = await soClient.find<EmulationReportAttributes>({
    type: emulationReportTypeName,
    filter,
    page,
    perPage,
    sortField: 'startedAt',
    sortOrder: 'desc',
  });

  return {
    items: result.saved_objects.map((so) => ({ id: so.id, attributes: so.attributes })),
    total: result.total,
    page: result.page,
    perPage: result.per_page,
  };
};
