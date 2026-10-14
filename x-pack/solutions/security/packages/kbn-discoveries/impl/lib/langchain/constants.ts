/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NodeType = {
  GENERATE_NODE: 'generate',
  REFINE_NODE: 'refine',
  RETRIEVE_ANONYMIZED_DOCS_NODE: 'retrieve_anonymized_docs',
} as const;
