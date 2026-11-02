/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';

export const unionWithNullType = <T extends runtimeTypes.Mixed>(type: T) =>
  runtimeTypes.union([type, runtimeTypes.null]);

/**
 * Unreachable Assertion helper for scenarios like exhaustive switches.
 * For references see: https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
 * This "x" should _always_ be a type of "never" and not change to "unknown" or any other type. See above link or the generic
 * concept of exhaustive checks in switch blocks.
 *
 * Optionally you can avoid the use of this by using early returns and TypeScript will clear your type checking without complaints
 * but there are situations and times where this function might still be needed.
 *
 * If you see an error, DO NOT cast "as never" such as:
 * assertUnreachable(x as never) // BUG IN YOUR CODE NOW AND IT WILL THROW DURING RUNTIME
 * If you see code like that remove it, as that deactivates the intent of this utility.
 * If you need to do that, then you should remove assertUnreachable from your code and
 * use a default at the end of the switch instead.
 * @param x Unreachable field
 * @param message Message of error thrown
 */
export const assertUnreachable = (
  x: never, // This should always be a type of "never"
  message = 'Unknown Field in switch statement'
): never => {
  throw new Error(`${message}: ${x}`);
};
