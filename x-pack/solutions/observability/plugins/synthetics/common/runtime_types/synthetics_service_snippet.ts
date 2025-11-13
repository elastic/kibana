/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const SyntheticsServiceErrorResponse = t.partial({
  error: t.string,
  message: t.string,
  statusCode: t.number,
});
export const SyntheticsServiceSnippet = t.type({
  name: t.string,
  label: t.string,
  detail: t.string,
  insertText: t.string,
});

export const SyntheticsServicePostSnippetSuccessResponse = t.type({
  snippet: SyntheticsServiceSnippet,
});
export const SyntheticsServicePostSnippetResponse = t.intersection([
  SyntheticsServicePostSnippetSuccessResponse,
  SyntheticsServiceErrorResponse,
]);

export const SyntheticsServiceGetSnippetsSuccessResponse = t.type({
  snippets: t.array(SyntheticsServiceSnippet),
});

export const SyntheticsServiceGetSnippetsResponse = t.intersection([
  SyntheticsServiceGetSnippetsSuccessResponse,
  SyntheticsServiceErrorResponse,
]);

export type SyntheticsServiceSnippet = t.TypeOf<typeof SyntheticsServiceSnippet>;

// Get
export type SyntheticsServiceGetSnippetsResponse = t.TypeOf<
  typeof SyntheticsServiceGetSnippetsResponse
>;
export type SyntheticsServiceGetSnippetsSuccessResponse = t.TypeOf<
  typeof SyntheticsServiceGetSnippetsSuccessResponse
>;

// Post
export type SyntheticsServicePostSnippetResponse = t.TypeOf<
  typeof SyntheticsServicePostSnippetResponse
>;
export type SyntheticsServicePostSnippetSuccessResponse = t.TypeOf<
  typeof SyntheticsServicePostSnippetSuccessResponse
>;
