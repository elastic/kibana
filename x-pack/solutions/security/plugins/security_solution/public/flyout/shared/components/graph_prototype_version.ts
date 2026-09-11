/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype visual versions of the graph investigation flyout.
 * Append new entries here as we iterate on the design.
 *
 * - v.1 renders `@kbn/cloud-security-posture-graph` `GraphInvestigation` (`src/components`)
 * - v.2 renders `GraphInvestigationV2` (`src/components_v2`)
 * Mocked / fetched graph data stays shared via `useFetchGraphData`.
 */
export const GRAPH_PROTOTYPE_VERSIONS = [
  { value: 'v1', text: 'v.1' },
  { value: 'v2', text: 'v.2' },
] as const;

export type GraphPrototypeVersion = (typeof GRAPH_PROTOTYPE_VERSIONS)[number]['value'];

export const DEFAULT_GRAPH_PROTOTYPE_VERSION: GraphPrototypeVersion = 'v2';
