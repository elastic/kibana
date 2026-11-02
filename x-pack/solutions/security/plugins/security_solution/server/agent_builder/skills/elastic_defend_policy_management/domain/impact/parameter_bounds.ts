/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  POLICY_CHANGE_BOUNDS_MESSAGE,
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  PolicyChangePreparationError,
} from './policy_change_operation';

export const MAX_SERIALIZED_BYTES = 65536;
export const MAX_NESTING_DEPTH = 16;

const throwInvalidInput = (): never => {
  throw new PolicyChangePreparationError(
    POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
    POLICY_CHANGE_BOUNDS_MESSAGE
  );
};

const isWalkable = (value: unknown): value is object =>
  value !== null && Object.prototype.toString.call(value) === '[object Object]';

const assertNestingDepth = (value: unknown, depth: number, seen: WeakSet<object>): void => {
  if (depth > MAX_NESTING_DEPTH) {
    throwInvalidInput();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throwInvalidInput();
    }
    seen.add(value);
    for (const child of value) {
      assertNestingDepth(child, depth + 1, seen);
    }
    seen.delete(value);
    return;
  }

  if (!isWalkable(value)) {
    return;
  }

  if (seen.has(value)) {
    throwInvalidInput();
  }

  seen.add(value);
  for (const child of Object.values(value)) {
    assertNestingDepth(child, depth + 1, seen);
  }
  seen.delete(value);
};

const serializedByteLength = (value: unknown): number => {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return throwInvalidInput();
  }
};

export const assertParameterBounds = (value: unknown): void => {
  if (serializedByteLength(value) > MAX_SERIALIZED_BYTES) {
    throwInvalidInput();
  }

  assertNestingDepth(value, 1, new WeakSet());
};
