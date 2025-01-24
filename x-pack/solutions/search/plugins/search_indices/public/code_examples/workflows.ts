/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type WorkflowId = 'default' | 'vector' | 'semantic';

export interface Workflow {
  title: string;
  id: WorkflowId;
  summary: string;
}

export const workflows: Workflow[] = [
  {
    title: i18n.translate('xpack.searchIndices.workflows.default', {
      defaultMessage: 'Keyword Search',
    }),
    id: 'default',
    summary: i18n.translate('xpack.searchIndices.workflows.defaultSummary', {
      defaultMessage: 'Set up an index in Elasticsearch using the text field mapping.',
    }),
  },
  {
    title: i18n.translate('xpack.searchIndices.workflows.vector', {
      defaultMessage: 'Vector Search',
    }),
    id: 'vector',
    summary: i18n.translate('xpack.searchIndices.workflows.vectorSummary', {
      defaultMessage: 'Set up an index in Elasticsearch using the dense_vector field mapping.',
    }),
  },
  {
    title: i18n.translate('xpack.searchIndices.workflows.semantic', {
      defaultMessage: 'Semantic Search',
    }),
    id: 'semantic',
    summary: i18n.translate('xpack.searchIndices.workflows.semanticSummary', {
      defaultMessage:
        "Semantic search in Elasticsearch is now simpler with the new semantic_text field type. This example walks through setting up your index with a semantic_text field, which uses Elastic's built-in ELSER machine learning model. If the model is not running, a new deployment will start once the mappings are defined.",
    }),
  },
];
