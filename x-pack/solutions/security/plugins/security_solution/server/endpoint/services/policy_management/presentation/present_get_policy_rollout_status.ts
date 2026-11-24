/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyRolloutStatus } from '../services/read_policy_rollout_status';
import {
  presentBoundedIdentityStrings,
  presentWithinGuardedBudget,
  type PresentedPolicyIdentity,
} from './trim_policy_result';

export const GET_POLICY_ROLLOUT_STATUS_MAX_RESULT_TOKENS = 8_000;

export interface PolicyRolloutStatusResult extends Record<string, unknown> {
  policy: PresentedPolicyIdentity<PolicyRolloutStatus['policy']>;
  spaceId: string;
  revision_coverage: {
    out_of_date_hosts: number;
    classified_hosts: number;
    undetermined_hosts: number;
    unclassified_overflow_hosts: number;
    truncated: boolean;
    source: string;
    population: string;
  };
  current_revision_responses: {
    needs_attention_hosts: number;
    classified_hosts: number;
    undetermined_hosts: number;
    upstream_unclassified_hosts: number;
    truncated: boolean;
    source: string;
    population: string;
    response_coverage_incomplete: boolean;
  };
}

const presentRolloutStatusPolicy = (policy: PolicyRolloutStatus['policy']) =>
  presentBoundedIdentityStrings({
    id: policy.id,
    name: policy.name,
    revision: policy.revision,
  });

export const presentPolicyRolloutStatus = (
  status: PolicyRolloutStatus
): PolicyRolloutStatusResult => {
  const presented: PolicyRolloutStatusResult = {
    policy: presentRolloutStatusPolicy(status.policy),
    spaceId: status.spaceId,
    revision_coverage: {
      out_of_date_hosts: status.revisionCoverage.outOfDateHosts,
      classified_hosts: status.revisionCoverage.classifiedHosts,
      undetermined_hosts: status.revisionCoverage.undeterminedHosts,
      unclassified_overflow_hosts: status.revisionCoverage.unclassifiedOverflowHosts,
      truncated: status.revisionCoverage.truncated,
      source: status.revisionCoverage.source,
      population: status.revisionCoverage.population,
    },
    current_revision_responses: {
      needs_attention_hosts: status.currentRevisionResponses.needsAttentionHosts,
      classified_hosts: status.currentRevisionResponses.classifiedHosts,
      undetermined_hosts: status.currentRevisionResponses.undeterminedHosts,
      upstream_unclassified_hosts: status.currentRevisionResponses.upstreamUnclassifiedHosts,
      truncated: status.currentRevisionResponses.truncated,
      source: status.currentRevisionResponses.source,
      population: status.currentRevisionResponses.population,
      response_coverage_incomplete: status.currentRevisionResponses.responseCoverageIncomplete,
    },
  };

  return presentWithinGuardedBudget(
    () => presented,
    GET_POLICY_ROLLOUT_STATUS_MAX_RESULT_TOKENS,
    () => presented
  );
};
