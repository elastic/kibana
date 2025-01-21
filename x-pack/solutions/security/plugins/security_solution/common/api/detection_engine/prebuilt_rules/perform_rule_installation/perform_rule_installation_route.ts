/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { RuleResponse } from '../../model';
import type { AggregatedPrebuiltRuleError } from '../model';

export const RuleVersionSpecifier = t.exact(
  t.type({
    rule_id: t.string,
    version: t.number,
  })
);
export type RuleVersionSpecifier = t.TypeOf<typeof RuleVersionSpecifier>;

export type InstallSpecificRulesRequest = t.TypeOf<typeof InstallSpecificRulesRequest>;

export const InstallSpecificRulesRequest = t.exact(
  t.type({
    mode: t.literal(`SPECIFIC_RULES`),
    rules: t.array(RuleVersionSpecifier),
  })
);

export type InstallAllRulesRequest = t.TypeOf<typeof InstallAllRulesRequest>;

export const InstallAllRulesRequest = t.exact(
  t.type({
    mode: t.literal(`ALL_RULES`),
  })
);

export const PerformRuleInstallationRequestBody = t.union([
  InstallAllRulesRequest,
  InstallSpecificRulesRequest,
]);

export type PerformRuleInstallationRequestBody = t.TypeOf<
  typeof PerformRuleInstallationRequestBody
>;

export enum SkipRuleInstallReason {
  ALREADY_INSTALLED = 'ALREADY_INSTALLED',
}

export interface SkippedRuleInstall {
  rule_id: string;
  reason: SkipRuleInstallReason;
}

export interface PerformRuleInstallationResponseBody {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
  results: {
    created: RuleResponse[];
    skipped: SkippedRuleInstall[];
  };
  errors: AggregatedPrebuiltRuleError[];
}
