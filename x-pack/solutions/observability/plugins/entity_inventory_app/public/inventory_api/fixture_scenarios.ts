/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Test-only list scenarios (truncated, failing sources, empty) over the fixture rows. Nothing in
 * the app imports this file, so it stays out of the plugin bundle.
 */

import type { EntityInventoryApiClient } from './client';
import { LIST_FIXTURES_BY_TYPE, NORMAL_ROW_COUNT } from './fixture_data';
import { createFixtureEntityInventoryApiClient, throwIfAborted } from './fixture_client';
import type { InventoryListResponse } from './types';

/** The list scenarios the scenario client can return. */
export type FixtureScenario =
  | 'normal'
  | 'truncated'
  | 'countFailed'
  | 'withDiagnostics'
  | 'empty'
  | 'allSourcesFailed';

const TRUNCATED_ROW_COUNT = 250;
const TRUNCATED_TOTAL = 12_345;

const SOURCE_ERRORS = [
  {
    indexPattern: 'metrics-system.*-*',
    status: 403,
    reason: 'security_exception: action [indices:data/read/esql] is unauthorized',
  },
  {
    indexPattern: 'metrics-hostmetricsreceiver.otel-*',
    status: null,
    reason: 'timeout: the query did not complete in time',
  },
];

const UNAVAILABLE_COLUMNS = [
  {
    indexPattern: 'metrics-hostmetricsreceiver.otel-*',
    column: 'k8s.cluster.name',
    field: 'k8s.cluster.name',
  },
];

/** Builds the list response of `type` for `scenario`, or `undefined` for an unknown type. */
export const buildScenarioListResponse = (
  type: string,
  scenario: FixtureScenario
): InventoryListResponse | undefined => {
  const fixture = LIST_FIXTURES_BY_TYPE[type];
  if (!fixture) {
    return undefined;
  }
  const { columns, buildRows } = fixture;
  const base = { columns, errors: [], unavailableColumns: [] };

  switch (scenario) {
    case 'truncated':
      return {
        ...base,
        rows: buildRows(TRUNCATED_ROW_COUNT),
        total: TRUNCATED_TOTAL,
        truncated: true,
      };
    case 'countFailed':
      return { ...base, rows: buildRows(TRUNCATED_ROW_COUNT), total: null, truncated: true };
    case 'withDiagnostics': {
      const rows = buildRows(NORMAL_ROW_COUNT);
      return {
        ...base,
        rows,
        total: rows.length,
        truncated: false,
        errors: SOURCE_ERRORS.slice(0, 1),
        unavailableColumns: UNAVAILABLE_COLUMNS,
      };
    }
    case 'empty':
      return { ...base, rows: [], total: 0, truncated: false };
    case 'allSourcesFailed':
      return { ...base, rows: [], total: null, truncated: true, errors: SOURCE_ERRORS };
    case 'normal': {
      const rows = buildRows(NORMAL_ROW_COUNT);
      return { ...base, rows, total: rows.length, truncated: false };
    }
  }
};

export interface ScenarioEntityInventoryApiClientOptions {
  /** The list response returned for every known type. Defaults to `normal`. */
  scenario?: FixtureScenario;
  /** When set, every list request rejects with this error. */
  failWith?: Error;
}

/** The fixture client with a chosen list scenario, or with every list request failing. */
export const createScenarioEntityInventoryApiClient = ({
  scenario = 'normal',
  failWith,
}: ScenarioEntityInventoryApiClientOptions = {}): EntityInventoryApiClient => ({
  ...createFixtureEntityInventoryApiClient(),
  getEntities: async (type, _request, { signal }) => {
    throwIfAborted(signal);
    if (failWith) {
      throw failWith;
    }
    const response = buildScenarioListResponse(type, scenario);
    if (!response) {
      throw new Error(`Entity type "${type}" not found`);
    }
    return response;
  },
});
