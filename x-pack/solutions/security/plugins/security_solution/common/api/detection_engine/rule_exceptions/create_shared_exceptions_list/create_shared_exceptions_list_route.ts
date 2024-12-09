/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const CreateSharedExceptionListRequest = t.exact(
  t.type({
    name: t.string,
    description: t.string,
  })
);
export type CreateSharedExceptionListRequest = t.TypeOf<typeof CreateSharedExceptionListRequest>;

export type CreateSharedExceptionListRequestDecoded = CreateSharedExceptionListRequest;
