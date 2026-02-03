/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GETTING_STARTED_INDEX_NAME,
  GETTING_STARTED_QUERY_OBJECT,
  GETTING_STARTED_SAMPLE_DOCS,
} from './constants';
import { CurlConnectDeploymentExample, CURL_INFO } from './curl';
import { JavascriptConnectDeploymentExample, JAVASCRIPT_INFO } from './javascript';
import { PythonConnectDeploymentExample, PYTHON_INFO } from './python';
import type { GettingStartedCodeExamples } from './types';

export const Languages = {
  python: PYTHON_INFO,
  javascript: JAVASCRIPT_INFO,
  curl: CURL_INFO,
};

export const LanguageOptions = Object.values(Languages);

export type AvailableLanguages = keyof typeof Languages;

export const GettingStartedCodeExample: GettingStartedCodeExamples = {
  curl: CurlConnectDeploymentExample,
  javascript: JavascriptConnectDeploymentExample,
  python: PythonConnectDeploymentExample,
  sampleDocs: GETTING_STARTED_SAMPLE_DOCS,
  indexName: GETTING_STARTED_INDEX_NAME,
  queryObject: GETTING_STARTED_QUERY_OBJECT,
};
