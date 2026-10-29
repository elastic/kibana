/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import githubDoc from './connector_docs/github.md.text';
import newRelicDoc from './connector_docs/newrelic.md.text';

export const CONNECTOR_MANIFEST_PATH = '/workspace/connectors.md';
/** Per-connector usage guides, read on demand by the agent. */
export const CONNECTOR_DOCS_ROOT = '/workspace/.connector-docs';
export const ELASTIC_MANIFEST_PATH = `${CONNECTOR_DOCS_ROOT}/elastic.md`;

export interface ConnectorDoc {
  service: string;
  path: string;
  content: string;
}

/** Service usage guides, seeded regardless of which connectors are assigned. */
export const CONNECTOR_DOCS: readonly ConnectorDoc[] = [
  { service: 'GitHub', path: `${CONNECTOR_DOCS_ROOT}/github.md`, content: githubDoc },
  { service: 'New Relic', path: `${CONNECTOR_DOCS_ROOT}/newrelic.md`, content: newRelicDoc },
];
