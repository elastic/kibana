/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/** A transport- and environment-neutral error returned by a capability. */
export const operationErrorRt = t.type({
  code: t.string,
  message: t.string,
  retryable: t.boolean,
});

export type OperationError = t.TypeOf<typeof operationErrorRt>;

export interface OperationSuccess<Value> {
  readonly status: 'success';
  readonly value: Value;
}

export interface OperationFailure {
  readonly status: 'failure';
  readonly error: OperationError;
}

/**
 * A capability outcome. A successful empty collection remains a success; it is
 * never represented as a failure or omitted value.
 */
export type OperationResult<Value> = OperationSuccess<Value> | OperationFailure;

export interface CompletePage<Item> {
  readonly status: 'complete';
  readonly items: readonly Item[];
}

export interface IncompletePage<Item> {
  readonly status: 'incomplete';
  readonly items: readonly Item[];
  readonly nextCursor: string;
}

/** A page reports incomplete coverage instead of silently returning a sample. */
export type PageResult<Item> = CompletePage<Item> | IncompletePage<Item> | OperationFailure;
