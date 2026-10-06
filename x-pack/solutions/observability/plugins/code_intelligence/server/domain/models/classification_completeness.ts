/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Separates usable classification results from submitted candidates that still need a decision. */
export interface ClassificationPartition<Result> {
  /** Holds exactly one result per resolved candidate, in candidate order. */
  readonly results: readonly Result[];
  /** Lists candidates the workflow omitted or answered with conflicting results, in candidate order. */
  readonly unresolvedIds: readonly string[];
}

/** Compares flat workflow results field by field, ignoring key order. */
const sameResult = (left: object, right: object): boolean => {
  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([key, value]) => (right as Record<string, unknown>)[key] === value)
  );
};

/** Matches workflow results to submitted candidates, ignoring unknown IDs, keeping agreeing duplicates once, and treating conflicting duplicates as unresolved. */
export const partitionClassificationResults = <
  Candidate extends { readonly id: string },
  Result extends { readonly id: string }
>(
  candidates: readonly Candidate[],
  results: readonly Result[]
): ClassificationPartition<Result> => {
  /** Groups returned results by ID so omissions and duplicates are both visible. */
  const byId = new Map<string, Result[]>();
  for (const result of results) {
    byId.set(result.id, [...(byId.get(result.id) ?? []), result]);
  }
  const resolved: Result[] = [];
  const unresolvedIds: string[] = [];
  for (const { id } of candidates) {
    const [first, ...others] = byId.get(id) ?? [];
    if (first !== undefined && others.every((other) => sameResult(first, other))) {
      resolved.push(first);
    } else {
      unresolvedIds.push(id);
    }
  }
  return { results: resolved, unresolvedIds };
};
