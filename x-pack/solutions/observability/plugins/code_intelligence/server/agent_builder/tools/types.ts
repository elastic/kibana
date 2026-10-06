/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteServices } from '../../routes';

/** What every Code Intelligence tool needs; services resolve at call time, after the plugin starts. */
export interface CodeIntelligenceToolDependencies {
  readonly catalogIndex: string;
  readonly findingsIndex: string;
  readonly settingsIndex: string;
  readonly getServices: () => RouteServices;
}

export const CODE_INTELLIGENCE_TOOL_IDS = {
  listRepositories: 'observability.code_intelligence.list_repositories',
  upsertRepository: 'observability.code_intelligence.upsert_repository',
  startExtraction: 'observability.code_intelligence.start_extraction',
  getExtractionStatus: 'observability.code_intelligence.get_extraction_status',
  searchCatalog: 'observability.code_intelligence.search_catalog',
  getFinding: 'observability.code_intelligence.get_finding',
  searchFindings: 'observability.code_intelligence.search_findings',
  updateFindingStatus: 'observability.code_intelligence.update_finding_status',
} as const;

export const CODE_INTELLIGENCE_TOOL_TAGS = ['observability', 'code-intelligence'];

export const CATALOG_QUERY_NOTE =
  'Catalog entries are concrete ES|QL queries over logs*, traces*, and metrics* derived from source code; run an entry query with the platform.core.execute_esql tool.';
