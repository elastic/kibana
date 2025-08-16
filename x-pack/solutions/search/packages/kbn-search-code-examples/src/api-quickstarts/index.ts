/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Export examples built from documentation
//   at https://www.elastic.co/docs/solutions/search/api-quickstarts

import { basicsQuickstartCommands } from './basics_quickstart';
import { QuickstartCodeExamples } from './types';

export const quickstartExamples: QuickstartCodeExamples = {
  basics: basicsQuickstartCommands,
  queryDSL: `# Query DSL Quickstart`,
  esql: `# ESQL Quickstart`,
  aggregations: `# Aggregations Quickstart`,
  semanticSearch: `# Semantic Search Quickstart`,
  hybridSearch: `# Hybrid Search Quickstart`,
  vectorSearch: `# Vector Search Quickstart`,
};
