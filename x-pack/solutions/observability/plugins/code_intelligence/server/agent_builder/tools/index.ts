/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetExtractionStatusTool } from './get_extraction_status';
import { createListRepositoriesTool } from './list_repositories';
import { createSearchCatalogTool } from './search_catalog';
import { createStartExtractionTool } from './start_extraction';
import type { CodeIntelligenceToolDependencies } from './types';
import { createUpsertRepositoryTool } from './upsert_repository';

export { CODE_INTELLIGENCE_TOOL_IDS, type CodeIntelligenceToolDependencies } from './types';

export const createCodeIntelligenceTools = (dependencies: CodeIntelligenceToolDependencies) =>
  [
    createListRepositoriesTool(dependencies),
    createUpsertRepositoryTool(dependencies),
    createStartExtractionTool(dependencies),
    createGetExtractionStatusTool(dependencies),
    createSearchCatalogTool(dependencies),
  ] as const;
