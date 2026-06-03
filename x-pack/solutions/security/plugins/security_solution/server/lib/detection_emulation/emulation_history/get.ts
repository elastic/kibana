/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { emulationReportTypeName, type EmulationReportAttributes } from '../emulation_report_type';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GetEmulationHistoryInput {
  id: string;
}

export interface GetEmulationHistoryDeps {
  /**
   * Must be the internal (hidden-type-aware) SO client variant.
   * Regular request-scoped clients cannot access hidden types.
   */
  soClient: SavedObjectsClientContract;
}

export interface GetEmulationHistoryResult {
  id: string;
  attributes: EmulationReportAttributes;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a single `detection-emulation-report` saved object by ID.
 *
 * The SO client is already namespace-scoped to the current space, so IDs
 * from other spaces are invisible and will surface as a not-found error.
 *
 * @throws A Kibana SavedObjects not-found error (output.statusCode 404) when
 *   the ID does not exist in the current space. `transformError` in the route
 *   layer maps this automatically to an HTTP 404 response.
 */
export const getEmulationHistory = async (
  input: GetEmulationHistoryInput,
  deps: GetEmulationHistoryDeps
): Promise<GetEmulationHistoryResult> => {
  const { id } = input;
  const { soClient } = deps;

  const result = await soClient.get<EmulationReportAttributes>(emulationReportTypeName, id);
  return { id: result.id, attributes: result.attributes };
};
