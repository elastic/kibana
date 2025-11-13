/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const SyntheticsServiceSnippet = t.type({
  name: t.string,
  label: t.string,
  detail: t.string,
  insertText: t.string,
});

export const SyntheticsServiceSnippetSaveType = t.intersection([
  t.type({
    success: t.boolean,
  }),
  t.partial({
    error: t.string,
  }),
]);

export type SyntheticsServiceSnippet = t.TypeOf<typeof SyntheticsServiceSnippet>;
export type SyntheticsServiceSnippetSaveResponse = t.TypeOf<
  typeof SyntheticsServiceSnippetSaveType
>;
