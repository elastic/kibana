/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Report gates for the Forensics Watch L3 leaf-quality scorecard.
 *
 * The scorecard computed `timelineOk`, `validatedIocs` and `confidenceOverall`
 * and then left all three out of `success`, which gated only on tool routing
 * and two guardrail flags. A run with zero timeline events, no validated IoC and
 * no stated confidence could therefore be green — the advertised forensic
 * quality regression gate was measuring routing, not quality.
 *
 * Both gates below are pure functions over the values the spec already extracts
 * from the tool-result payload, so they are unit-tested directly instead of
 * being reachable only through a live stack.
 */

export type IocStatus = 'confirmed' | 'not_found' | 'unable_to_validate';

export interface ExpectedIoc {
  type: string;
  value: string;
  status: IocStatus;
}

export interface ValidatedIoc {
  type?: string;
  value?: string;
  status?: string;
}

export interface IocGateResult {
  expectedCount: number;
  matchedCount: number;
  /** Expected `confirmed` IoCs the report did not confirm. */
  missingConfirmed: string[];
  /** IoCs the dataset expects to be ABSENT that the report claims to confirm. */
  fabricatedConfirmed: string[];
  success: boolean;
}

const iocKey = (ioc: { type?: string; value?: string }): string =>
  `${ioc.type ?? ''}::${ioc.value ?? ''}`;

/**
 * Compares the report's validated IoCs against the dataset expectation.
 *
 * Two independent failure modes, both real:
 *   - a `confirmed` expectation the report did not confirm means the worker
 *     ignored telemetry the fixture actually contains;
 *   - a `not_found` expectation the report claims to confirm means the worker
 *     fabricated a confirmation (the fixture deliberately does not contain it).
 *
 * `unable_to_validate` expectations are deliberately not scored in either
 * direction: they are the cases the platform cannot answer either way, so
 * neither confirming nor declining them is treated as a failure. Only the
 * decidable expectations carry gate weight.
 */
export const evaluateIocGate = (expected: ExpectedIoc[], actual: ValidatedIoc[]): IocGateResult => {
  const actualByKey = new Map(actual.map((ioc) => [iocKey(ioc), ioc]));
  const missingConfirmed: string[] = [];
  const fabricatedConfirmed: string[] = [];
  let matchedCount = 0;

  for (const exp of expected) {
    const got = actualByKey.get(iocKey(exp));
    if (got?.status === exp.status) matchedCount++;
    if (exp.status === 'confirmed' && got?.status !== 'confirmed') {
      missingConfirmed.push(iocKey(exp));
    }
    if (exp.status === 'not_found' && got?.status === 'confirmed') {
      fabricatedConfirmed.push(iocKey(exp));
    }
  }

  return {
    expectedCount: expected.length,
    matchedCount,
    missingConfirmed,
    fabricatedConfirmed,
    success:
      expected.length > 0 &&
      matchedCount >= 1 &&
      missingConfirmed.length === 0 &&
      fabricatedConfirmed.length === 0,
  };
};

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

const CONFIDENCE_RANK: Record<string, number> = {
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * True when the report's stated overall confidence meets the dataset floor.
 *
 * An unstated confidence fails: the whole point of the floor is that the report
 * commits to an assessment. `insufficient` ranks below `low`, so a report that
 * declines to assess cannot satisfy a `low` floor either.
 */
export const meetsConfidenceFloor = (
  overall: string | undefined,
  floor: ConfidenceLevel
): boolean => {
  if (overall === undefined) return false;
  const rank = CONFIDENCE_RANK[overall.toLowerCase()];
  return rank !== undefined && rank >= CONFIDENCE_RANK[floor];
};
