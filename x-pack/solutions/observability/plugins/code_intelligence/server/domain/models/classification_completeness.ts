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
  /** Lists candidates the workflow omitted or answered more than once, in candidate order. */
  readonly unresolvedIds: readonly string[];
}

/** Matches workflow results to submitted candidates, ignoring unknown IDs and treating duplicates as unresolved. */
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
    const matches = byId.get(id) ?? [];
    if (matches.length === 1 && matches[0] !== undefined) {
      resolved.push(matches[0]);
    } else {
      unresolvedIds.push(id);
    }
  }
  return { results: resolved, unresolvedIds };
};
