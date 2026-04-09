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

// ---------------------------------------------------------------------------
// Elasticsearch index helpers
// ---------------------------------------------------------------------------

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
