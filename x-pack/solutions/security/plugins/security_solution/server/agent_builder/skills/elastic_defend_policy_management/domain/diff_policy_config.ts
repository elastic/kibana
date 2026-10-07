/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NormalizedPolicyConfig } from './normalized_policy_config';
import { policyValuesEqual } from './policy_value_equality';

export interface PolicyDiffEntry {
  readonly path: string;
  readonly from: unknown;
  readonly to: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const childPath = (path: string, key: string): string => (path === '' ? key : `${path}.${key}`);

const collectDiffs = (fromValue: unknown, toValue: unknown, path: string): PolicyDiffEntry[] => {
  if (policyValuesEqual(fromValue, toValue)) {
    return [];
  }

  if (isRecord(fromValue) && isRecord(toValue)) {
    const keys = new Set([...Object.keys(fromValue), ...Object.keys(toValue)]);
    return [...keys].flatMap((key) =>
      collectDiffs(fromValue[key], toValue[key], childPath(path, key))
    );
  }

  if (isRecord(fromValue)) {
    return Object.keys(fromValue).flatMap((key) =>
      collectDiffs(fromValue[key], undefined, childPath(path, key))
    );
  }

  if (isRecord(toValue)) {
    return Object.keys(toValue).flatMap((key) =>
      collectDiffs(undefined, toValue[key], childPath(path, key))
    );
  }

  return [{ path, from: fromValue, to: toValue }];
};

export const diffPolicyConfig = (
  a: NormalizedPolicyConfig,
  b: NormalizedPolicyConfig
): readonly PolicyDiffEntry[] => collectDiffs(a, b, '');
