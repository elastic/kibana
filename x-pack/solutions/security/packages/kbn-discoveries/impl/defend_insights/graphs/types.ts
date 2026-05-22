/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Interface for the Knowledge Base data client methods used by the Defend Insights graph.
 * This allows the package to be independent of the elastic_assistant plugin's implementation.
 */
export interface IKnowledgeBaseDataClient {
  getKnowledgeBaseDocumentEntries: (params: {
    filter?: QueryDslQueryContainer;
    kbResource?: string;
    query: string;
    required?: boolean;
  }) => Promise<Document[]>;
}
