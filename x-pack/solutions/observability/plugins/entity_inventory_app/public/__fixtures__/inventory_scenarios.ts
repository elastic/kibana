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

import type {
  ListProbeDiagnostic,
  ListQueryDiagnostic,
  ListResponse,
  SourceError,
} from '@kbn/entity-inventory-plugin/common';
import type { EntityInventoryApiClient } from '../inventory_api/client';
import { LIST_FIXTURES_BY_TYPE, NORMAL_ROW_COUNT } from './inventory_data';
import { createFixtureEntityInventoryApiClient, throwIfAborted } from './inventory_client';

/** The list scenarios the scenario client can return. */
export type FixtureScenario =
  | 'normal'
  | 'truncated'
  | 'withDiagnostics'
  | 'empty'
  | 'allSourcesFailed';

const TRUNCATED_ROW_COUNT = 250;

const SYSTEM_PATTERN = 'metrics-system.*-*';
const OTEL_PATTERN = 'metrics-hostmetricsreceiver.otel-*';

const NO_STATS = {
  took: null,
  documentsFound: null,
  valuesLoaded: null,
  rowsEmitted: null,
  cpuNanos: null,
  driverNanos: null,
  bytesRead: null,
  shards: null,
};

const probe = (indexPattern: string, error: SourceError | null = null): ListProbeDiagnostic => ({
  indexPattern,
  esql: `TS ${indexPattern} | LIMIT 1`,
  params: [],
  outcome: error ? 'failed' : 'no_time_series',
  ...NO_STATS,
  isPartial: error ? null : false,
  error,
});

const query = (
  indexPattern: string,
  { isPartial = false, error = null }: Partial<Pick<ListQueryDiagnostic, 'isPartial' | 'error'>>
): ListQueryDiagnostic => ({
  indexPattern,
  engine: 'FROM',
  esql: `FROM ${indexPattern}`,
  params: [],
  rowCount: 0,
  ...NO_STATS,
  isPartial,
  error,
});

// The OpenTelemetry source's probe fails, so it runs no query; only the system source's runs.
const PROBES = [
  probe(SYSTEM_PATTERN),
  probe(OTEL_PATTERN, {
    kind: 'failed',
    status: null,
    reason: 'timeout: the query did not complete in time',
  }),
];

const UNAVAILABLE_COLUMNS = [
  {
    indexPattern: OTEL_PATTERN,
    column: 'k8s.cluster.name',
    field: 'k8s.cluster.name',
  },
];

/** Builds the list response of `type` for `scenario`, or `undefined` for an unknown type. */
export const buildScenarioListResponse = (
  type: string,
  scenario: FixtureScenario
): ListResponse | undefined => {
  const fixture = LIST_FIXTURES_BY_TYPE[type];
  if (!fixture) {
    return undefined;
  }
  const { columns, buildRows } = fixture;
  const base = {
    columns,
    provenance: {},
    queries: [],
    probes: [],
    timings: {
      definitionMs: 0,
      planningMs: 0,
      probesMs: 0,
      queriesMs: 0,
      processingMs: 0,
      totalMs: 0,
    },
    unavailableColumns: [],
  };

  switch (scenario) {
    case 'truncated':
      return { ...base, rows: buildRows(TRUNCATED_ROW_COUNT), truncated: true };
    case 'withDiagnostics': {
      const rows = buildRows(NORMAL_ROW_COUNT);
      return {
        ...base,
        rows,
        truncated: false,
        probes: PROBES,
        queries: [query(SYSTEM_PATTERN, { isPartial: true })],
        unavailableColumns: UNAVAILABLE_COLUMNS,
      };
    }
    case 'empty':
      return { ...base, rows: [], truncated: false };
    case 'allSourcesFailed':
      return {
        ...base,
        rows: [],
        truncated: false,
        probes: PROBES,
        queries: [
          query(SYSTEM_PATTERN, {
            isPartial: null,
            error: {
              kind: 'failed',
              status: 403,
              reason: 'security_exception: action [indices:data/read/esql] is unauthorized',
            },
          }),
        ],
      };
    case 'normal': {
      const rows = buildRows(NORMAL_ROW_COUNT);
      return { ...base, rows, truncated: false };
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
