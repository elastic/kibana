/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const SyntheticsServiceApiKeyType = t.type({
  id: t.string,
  name: t.string,
  apiKey: t.string,
});

export const SyntheticsServiceApiKeySaveType = t.intersection([
  t.type({
    success: t.boolean,
  }),
  t.partial({
    error: t.string,
  }),
]);

export type SyntheticsServiceApiKey = t.TypeOf<typeof SyntheticsServiceApiKeyType>;
export type SyntheticsServiceApiKeySaveResponse = t.TypeOf<typeof SyntheticsServiceApiKeySaveType>;
