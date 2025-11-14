/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const SyntheticsServiceErrorResponseCodec = t.partial({
  error: t.string,
  message: t.string,
  statusCode: t.number,
});
export const SyntheticsServiceSnippetCodec = t.type({
  name: t.string,
  label: t.string,
  detail: t.string,
  insertText: t.string,
});

export type SyntheticsServiceSnippetType = t.TypeOf<typeof SyntheticsServiceSnippetCodec>;
export type SyntheticsServiceSnippetWithIdType = SyntheticsServiceSnippetType & { id: string };

// Get
export const SyntheticsServiceGetSnippetsSuccessResponseCodec = t.type({
  snippets: t.array(SyntheticsServiceSnippetCodec),
});
export const SyntheticsServiceGetSnippetsResponseCodec = t.intersection([
  SyntheticsServiceGetSnippetsSuccessResponseCodec,
  SyntheticsServiceErrorResponseCodec,
]);
export type SyntheticsServiceGetSnippetsResponseType = t.TypeOf<
  typeof SyntheticsServiceGetSnippetsResponseCodec
>;
export type SyntheticsServiceGetSnippetsSuccessResponseType = t.TypeOf<
  typeof SyntheticsServiceGetSnippetsSuccessResponseCodec
>;

// Post
export const SyntheticsServicePostSnippetSuccessResponseCodec = t.type({
  snippet: SyntheticsServiceSnippetCodec,
});
export type SyntheticsServicePostSnippetSuccessResponseType = t.TypeOf<
  typeof SyntheticsServicePostSnippetSuccessResponseCodec
>;

export const SyntheticsServicePostSnippetResponseCodec = t.intersection([
  SyntheticsServicePostSnippetSuccessResponseCodec,
  SyntheticsServiceErrorResponseCodec,
]);
export type SyntheticsServicePostSnippetResponseType = t.TypeOf<
  typeof SyntheticsServicePostSnippetResponseCodec
>;
