/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface QuickstartCodeExamples {
  basics: QuickstartCodeSnippetFunction<BasicsCodeSnippetParameters>;
}

export type QuickstartCodeSnippetFunction<T extends QuickstartCodeSnippetParameters> = (
  params: T
) => string;

export type QuickstartCodeSnippetParameters = BasicsCodeSnippetParameters;

export interface BasicsCodeSnippetParameters {
  indexName?: string;
  createIndex: boolean;
}
