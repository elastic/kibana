/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IngestDataCodeExamples } from '../types';

import { JSIngestDataExample, JSSemanticIngestDataExample } from './javascript';
import { PythonIngestDataExample, PythonSemanticIngestDataExample } from './python';
import { ConsoleIngestDataExample, ConsoleSemanticIngestDataExample } from './sense';
import { CurlIngestDataExample } from './curl';
import { INSTALL_INSTRUCTIONS_TITLE, INSTALL_INSTRUCTIONS_DESCRIPTION } from './constants';

const addMappingsTitle = i18n.translate(
  'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsTitle',
  {
    defaultMessage: 'Define field mappings',
  }
);

export const DefaultIngestDataCodeExamples: IngestDataCodeExamples = {
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  addMappingsTitle,
  addMappingsDescription: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.default.mappingsDescription',
    {
      defaultMessage:
        'This example defines one field: a text field that will provide full-text search capabilities. You can add more field types by modifying the mappings in your API call, or in the mappings tab.',
    }
  ),
  defaultMapping: {
    text: { type: 'text' },
  },
  sense: ConsoleIngestDataExample,
  curl: CurlIngestDataExample,
  python: PythonIngestDataExample,
  javascript: JSIngestDataExample,
};

export const DenseVectorIngestDataCodeExamples: IngestDataCodeExamples = {
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  addMappingsTitle,
  addMappingsDescription: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsDescription',
    {
      defaultMessage:
        'This example defines two fields: a 3-dimensional dense vector field and a text field. You can add more field types by modifying the mappings in your API call, or in the mappings tab.',
    }
  ),
  defaultMapping: {
    vector: { type: 'dense_vector', dims: 3 },
    text: { type: 'text' },
  },
  sense: ConsoleIngestDataExample,
  curl: CurlIngestDataExample,
  python: PythonIngestDataExample,
  javascript: JSIngestDataExample,
};

export const SemanticIngestDataCodeExamples: IngestDataCodeExamples = {
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  addMappingsTitle,
  addMappingsDescription: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsDescription',
    {
      defaultMessage:
        'This example defines one field: a semantic text field that will provide vector search capabilities using the default ELSER model. You can add more field types by modifying the mappings in your API call, or in the mappings tab.',
    }
  ),
  defaultMapping: {
    text: { type: 'semantic_text' },
  },
  sense: ConsoleSemanticIngestDataExample,
  curl: CurlIngestDataExample,
  python: PythonSemanticIngestDataExample,
  javascript: JSSemanticIngestDataExample,
};
