/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetrieverContainer } from '@elastic/elasticsearch/lib/api/types';

export interface CodeSnippetParameters {
  apiKey?: string;
  elasticsearchURL: string;
  isServerless?: boolean;
}

export interface GettingStartedCodeDefinition {
  gettingStartedSemantic: GettingStartedCodeSnippetFunction;
  installCommandShell?: string;
}

export type GettingStartedCodeSnippetFunction = (
  params: GettingStartedCodeSnippetParameters
) => string;

export interface GettingStartedCodeSnippetParameters extends CodeSnippetParameters {
  queryObject: { retriever: RetrieverContainer };
  sampleDocuments: object[];
}

export interface GettingStartedCodeExamples {
  curl: GettingStartedCodeDefinition;
  python: GettingStartedCodeDefinition;
  javascript: GettingStartedCodeDefinition;
  sampleDocs: { text: string }[];
  indexName: string;
  queryObject: GettingStartedQueryObject;
}

export interface CodeLanguage {
  id: string;
  title: string;
  icon: string;
  codeBlockLanguage: string;
}
interface SemanticQuery {
  semantic: {
    field: string;
    query: string;
  };
}

interface StandardRetriever {
  standard: {
    query: SemanticQuery;
  };
}

export interface GettingStartedQueryObject {
  retriever: StandardRetriever;
}
