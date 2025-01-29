/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateIndexCodeExamples } from '../types';
import {
  CONNECT_CREATE_DEFAULT_INDEX_CMD_DESCRIPTION,
  CONNECT_CREATE_DEFAULT_INDEX_CMD_TITLE,
  CONNECT_CREATE_SEMANTIC_INDEX_CMD_DESCRIPTION,
  CONNECT_CREATE_SEMANTIC_INDEX_CMD_TITLE,
  CONNECT_CREATE_VECTOR_INDEX_CMD_DESCRIPTION,
  CONNECT_CREATE_VECTOR_INDEX_CMD_TITLE,
  INSTALL_INSTRUCTIONS_DESCRIPTION,
  INSTALL_INSTRUCTIONS_TITLE,
} from './constants';

import { CurlCreateIndexExamples } from './curl';
import { JavascriptCreateIndexExamples } from './javascript';
import { PythonCreateIndexExamples } from './python';
import { ConsoleCreateIndexExamples } from './sense';

export const DefaultCodeExamples: CreateIndexCodeExamples = {
  exampleType: 'search',
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  createIndexTitle: CONNECT_CREATE_DEFAULT_INDEX_CMD_TITLE,
  createIndexDescription: CONNECT_CREATE_DEFAULT_INDEX_CMD_DESCRIPTION,
  sense: ConsoleCreateIndexExamples.default,
  curl: CurlCreateIndexExamples.default,
  python: PythonCreateIndexExamples.default,
  javascript: JavascriptCreateIndexExamples.default,
};

export const DenseVectorCodeExamples: CreateIndexCodeExamples = {
  exampleType: 'vector',
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  createIndexTitle: CONNECT_CREATE_VECTOR_INDEX_CMD_TITLE,
  createIndexDescription: CONNECT_CREATE_VECTOR_INDEX_CMD_DESCRIPTION,
  sense: ConsoleCreateIndexExamples.dense_vector,
  curl: CurlCreateIndexExamples.dense_vector,
  python: PythonCreateIndexExamples.dense_vector,
  javascript: JavascriptCreateIndexExamples.dense_vector,
};

export const SemanticCodeExamples: CreateIndexCodeExamples = {
  exampleType: 'semantic',
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  createIndexTitle: CONNECT_CREATE_SEMANTIC_INDEX_CMD_TITLE,
  createIndexDescription: CONNECT_CREATE_SEMANTIC_INDEX_CMD_DESCRIPTION,
  sense: ConsoleCreateIndexExamples.semantic,
  curl: CurlCreateIndexExamples.semantic,
  python: PythonCreateIndexExamples.semantic,
  javascript: JavascriptCreateIndexExamples.semantic,
};
