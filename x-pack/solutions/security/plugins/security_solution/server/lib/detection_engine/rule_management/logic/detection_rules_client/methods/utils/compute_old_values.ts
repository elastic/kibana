/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject } from 'lodash';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';

/**
 * Compute `old_values` for a rule history item: the RFC 7396 merge patch
 * describing the differences between `current` and `previous`. Returns `null`
 * when there is no predecessor (creation event) and an empty object when
 * `current` and `previous` are deep-equal.
 */
export function computeOldValues(
  current: RuleResponse,
  previous: RuleResponse | undefined
): Record<string, unknown> | null {
  if (previous === undefined) {
    return null;
  }
  const patch = mergePatchFromTo(current, previous);

  if (patch === undefined) {
    return {};
  }

  return patch as Record<string, unknown>;
}

/**
 * Compute an RFC 7396 JSON Merge Patch describing how to transform `current`
 * back to `previous`. The result contains only the fields whose values differ
 * between the two objects. Returns `undefined` when the two are deep-equal.
 *
 * Semantics (per RFC 7396):
 *  - Keys present in both with equal values are omitted.
 *  - Keys present in `current` but missing in `previous` map to `null`.
 *  - Keys present in `previous` but missing in `current` map to the value from
 *    `previous`.
 *  - Keys present in both with object values recurse; if the recursion produces
 *    an empty patch, the key is omitted.
 *  - Arrays and primitives are compared as whole values; if they differ, the
 *    `previous` value is emitted under the key.
 */
function mergePatchFromTo(current: unknown, previous: unknown): unknown | undefined {
  if (Object.is(current, previous)) {
    return undefined;
  }

  if (isPlainObject(current) && isPlainObject(previous)) {
    const currentObject = current as Record<string, unknown>;
    const previousObject = previous as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const keys = new Set<string>([...Object.keys(currentObject), ...Object.keys(previousObject)]);

    for (const key of keys) {
      const inCurrent = key in currentObject;
      const inPrevious = key in previousObject;

      if (inCurrent && !inPrevious) {
        patch[key] = null;
      } else if (!inCurrent && inPrevious) {
        patch[key] = previousObject[key];
      } else {
        const sub = mergePatchFromTo(currentObject[key], previousObject[key]);

        if (sub !== undefined) {
          patch[key] = sub;
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      return undefined;
    }

    return patch;
  }

  if (Array.isArray(current) && Array.isArray(previous)) {
    if (isEqual(current, previous)) {
      return undefined;
    }

    return previous;
  }

  return previous;
}
