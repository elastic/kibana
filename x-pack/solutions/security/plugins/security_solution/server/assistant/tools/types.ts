/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Standardized citation metadata that all BuiltInTools should return
 */
export interface ToolCitation {
  id: string;
  type:
    | 'Href'
    | 'KnowledgeBaseEntry'
    | 'SecurityAlert'
    | 'SecurityAlertsPage'
    | 'ProductDocumentation'
    | 'EsqlQuery';
  metadata: Record<string, any>;
}

/**
 * Tool result interface that includes optional citations array
 */
export interface ToolResultWithCitations {
  citations?: ToolCitation[];
  [key: string]: any;
}
