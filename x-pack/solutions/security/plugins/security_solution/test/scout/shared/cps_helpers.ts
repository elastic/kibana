/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reusable CPS (Cross-Project Search) helpers for Scout tests.
 *
 * Provides constants, Elasticsearch index/document helpers, and Kibana space
 * utilities. Framework-agnostic — no dependency on apiClient, browser fixtures,
 * or any specific test suite.
 *
 * Servers must be started with the cps_local config set:
 *   node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet cps_local
 */

import { tags, type EsClient } from '@kbn/scout-security';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CPS_TAGS = [...tags.serverless.security.complete];

/** NPRE expression: search only the origin (self-linked) project. */
export const SPACE_PROJECT_ROUTING_ORIGIN_ONLY = '_alias:_origin';

/** NPRE expression: search the origin and all linked projects. */
export const SPACE_PROJECT_ROUTING_ALL = '_alias:*';

export const CPS_ORIGIN_HOST = 'scout-cps-origin-host';
export const CPS_LINKED_HOST = 'scout-cps-linked-host';

/** Full mapping for detection-engine-oriented CPS test indices. */
export const CPS_DETECTION_TEST_INDEX_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' as const },
    cps_run_id: { type: 'keyword' as const },
    'cps.detection.test.run_id': { type: 'keyword' as const },
    'host.name': { type: 'keyword' as const },
    'event.kind': { type: 'keyword' as const },
    'threat.indicator': {
      properties: {
        host: {
          properties: {
            name: { type: 'keyword' as const },
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Rule type definitions
// ---------------------------------------------------------------------------

export type CpsRuleCompatibilityType =
  | 'query'
  | 'eql'
  | 'saved_query'
  | 'threshold'
  | 'threat_match'
  | 'new_terms'
  | 'esql';

export const CPS_RULE_COMPATIBILITY_TYPES: readonly CpsRuleCompatibilityType[] = [
  'query',
  'eql',
  'saved_query',
  'threshold',
  'threat_match',
  'new_terms',
  'esql',
] as const;

// ---------------------------------------------------------------------------
// Pure utilities
// ---------------------------------------------------------------------------

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const getAlertsIndexForSpace = (spaceId: string): string =>
  `.alerts-security.alerts-${spaceId}`;

/**
 * Returns the expected host names for a given CPS routing mode based on the
 * canonical origin/linked host constants.
 */
export const getExpectedHostNames = (params: {
  routing: 'origin' | 'all_projects';
}): { expectedCount: number; expectedSortedHosts: string[] } => {
  if (params.routing === 'origin') {
    return { expectedCount: 1, expectedSortedHosts: [CPS_ORIGIN_HOST] };
  }
  return {
    expectedCount: 2,
    expectedSortedHosts: [CPS_LINKED_HOST, CPS_ORIGIN_HOST].sort(),
  };
};

// ---------------------------------------------------------------------------
// Elasticsearch index helpers
// ---------------------------------------------------------------------------

/**
 * Creates an index with the full {@link CPS_DETECTION_TEST_INDEX_MAPPINGS}
 * and seeds a single document.
 */
export const createSimpleTestIndex = async (params: {
  index: string;
  esClient: EsClient;
  docBodyOverrides?: Record<string, unknown>;
  runId: string;
}): Promise<void> => {
  const { index, esClient, docBodyOverrides, runId } = params;
  const docTimestamp = new Date(Date.now() - 60_000).toISOString();

  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({ index, mappings: CPS_DETECTION_TEST_INDEX_MAPPINGS });

  const body = {
    '@timestamp': docTimestamp,
    cps_run_id: runId,
    'cps.detection.test.run_id': runId,
    'host.name': 'hostname',
    ...docBodyOverrides,
  };

  await esClient.index({ index, refresh: 'wait_for', body });
};

/**
 * Creates an index with a caller-specified "marker" field and seeds one
 * document. Useful for verifying that field lists are scoped correctly
 * across CPS clusters.
 */
export const createMarkerFieldIndex = async (params: {
  esClient: EsClient;
  index: string;
  markerField: string;
}): Promise<void> => {
  const { esClient, index, markerField } = params;
  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        [markerField]: { type: 'keyword' },
      },
    },
  });
  await esClient.index({
    index,
    refresh: 'wait_for',
    body: {
      '@timestamp': new Date(Date.now() - 60_000).toISOString(),
      'host.name': `${markerField}-host`,
      [markerField]: 'present',
    },
  });
};

/**
 * Seeds a single cluster with detection + enrichment documents suitable for
 * threat-match rule testing.
 */
export const seedThreatMatchCluster = async (params: {
  index: string;
  esClient: EsClient;
  runId: string;
  hostName: string;
}): Promise<void> => {
  const { index, esClient, runId, hostName } = params;
  const docTimestamp = new Date(Date.now() - 60_000).toISOString();

  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({ index, mappings: CPS_DETECTION_TEST_INDEX_MAPPINGS });

  await esClient.index({
    index,
    refresh: 'wait_for',
    body: {
      '@timestamp': docTimestamp,
      cps_run_id: runId,
      'cps.detection.test.run_id': runId,
      'event.kind': 'event',
      'host.name': hostName,
    },
  });

  await esClient.index({
    index,
    refresh: 'wait_for',
    body: {
      '@timestamp': docTimestamp,
      cps_run_id: runId,
      'cps.detection.test.run_id': runId,
      'event.kind': 'enrichment',
      'host.name': hostName,
      'threat.indicator': {
        host: { name: hostName },
      },
    },
  });
};

/**
 * Seeds both origin and linked clusters with the appropriate documents for
 * the given rule type. Threat-match rules get dedicated enrichment docs;
 * all other rule types use {@link createSimpleTestIndex}.
 */
export const seedCpsDocuments = async (params: {
  ruleType: CpsRuleCompatibilityType;
  testIndex: string;
  runId: string;
  esClient: EsClient;
  linkedEs: EsClient;
}): Promise<void> => {
  const { ruleType, testIndex, runId, esClient, linkedEs } = params;

  if (ruleType === 'threat_match') {
    await seedThreatMatchCluster({ index: testIndex, esClient, runId, hostName: CPS_ORIGIN_HOST });
    await seedThreatMatchCluster({
      index: testIndex,
      esClient: linkedEs,
      runId,
      hostName: CPS_LINKED_HOST,
    });
    return;
  }

  await createSimpleTestIndex({
    index: testIndex,
    esClient,
    runId,
    docBodyOverrides: { 'host.name': CPS_ORIGIN_HOST },
  });
  await createSimpleTestIndex({
    index: testIndex,
    esClient: linkedEs,
    runId,
    docBodyOverrides: { 'host.name': CPS_LINKED_HOST },
  });
};

// ---------------------------------------------------------------------------
// Kibana space helpers
// ---------------------------------------------------------------------------

interface KbnClientLike {
  request: (opts: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    body?: unknown;
  }) => Promise<unknown>;
}

/** Creates a Kibana space with the specified CPS project routing. */
export const createCpsSpace = async (params: {
  kbnClient: KbnClientLike;
  spaceId: string;
  projectRouting: string;
}): Promise<void> => {
  const { kbnClient, spaceId, projectRouting } = params;
  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/space',
    body: {
      id: spaceId,
      name: `CPS detection test ${spaceId}`,
      description: 'Temporary space for CPS Scout tests',
      disabledFeatures: [],
      projectRouting,
    },
  });
};

/** Deletes a Kibana space, swallowing errors (e.g. space already deleted). */
export const deleteCpsSpace = async (params: {
  kbnClient: KbnClientLike;
  spaceId: string;
}): Promise<void> => {
  await params.kbnClient
    .request({ method: 'DELETE', path: `/api/spaces/space/${params.spaceId}` })
    .catch(() => {});
};

// ---------------------------------------------------------------------------
// Cleanup helpers
// ---------------------------------------------------------------------------

/** Deletes a test index from both origin and linked clusters. */
export const deleteTestIndices = async (params: {
  esClient: EsClient;
  linkedEs: EsClient;
  index: string;
}): Promise<void> => {
  const { esClient, linkedEs, index } = params;
  await esClient.indices.delete({ index }, { ignore: [404] });
  await linkedEs.indices.delete({ index }, { ignore: [404] });
};
