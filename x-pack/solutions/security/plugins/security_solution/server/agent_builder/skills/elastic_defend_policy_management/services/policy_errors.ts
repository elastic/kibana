/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

const MAX_AMBIGUOUS_NAME_CANDIDATES = 10;

export const POLICY_ERROR_MESSAGES = {
  not_authorized: 'Not authorized for policy management',
  not_found: 'Endpoint policy not found',
  ambiguous_name: 'Multiple endpoint policies match the given name',
  invalid_policy: 'Selected policy is not a valid endpoint policy',
  baseline_unavailable:
    'Endpoint policy baseline is unavailable because the license is missing or not available',
  version_conflict: 'Policy changed since it was assessed; assess again before applying',
  blocked_change:
    'Requested change is blocked by the current policy state, license, or product features',
  no_change: 'Requested change would not modify the policy',
  write_rejected: 'Write not attempted: an authenticated agent-sourced request is required',
  write_unverified:
    'The update may have persisted; its outcome is unknown. Do not retry automatically. Read and reassess current state before requesting a newly confirmed write',
} as const;

export type PolicyWriteIdentity = Readonly<{
  id: string;
  name: string;
  revision: number;
  version: string;
}>;

export class PolicyNotFoundError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.not_found);
    this.name = 'PolicyNotFoundError';
  }
}

export class PolicyAmbiguousNameError extends Error {
  public readonly candidates: ReadonlyArray<Readonly<{ id: string; name: string }>>;
  public readonly candidatesTruncated: boolean;
  public readonly candidatesTotal: number;

  constructor(
    candidates: ReadonlyArray<Readonly<{ id: string; name: string }>>,
    candidatesTotal: number = candidates.length
  ) {
    const bounded = candidates.slice(0, MAX_AMBIGUOUS_NAME_CANDIDATES).map(({ id, name }) => ({
      id,
      name,
    }));
    super(POLICY_ERROR_MESSAGES.ambiguous_name);
    this.name = 'PolicyAmbiguousNameError';
    this.candidates = bounded;
    this.candidatesTotal = candidatesTotal;
    this.candidatesTruncated = candidatesTotal > bounded.length;
  }
}

export class InvalidEndpointPolicyError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.invalid_policy);
    this.name = 'InvalidEndpointPolicyError';
  }
}

export class PolicyBaselineUnavailableError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.baseline_unavailable);
    this.name = 'PolicyBaselineUnavailableError';
  }
}

export class PolicyVersionConflictError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.version_conflict);
    this.name = 'PolicyVersionConflictError';
  }
}

export class PolicyBlockedChangeError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.blocked_change);
    this.name = 'PolicyBlockedChangeError';
  }
}

export class PolicyNoChangeError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.no_change);
    this.name = 'PolicyNoChangeError';
  }
}

export class PolicyWriteRejectedError extends Error {
  constructor() {
    super(POLICY_ERROR_MESSAGES.write_rejected);
    this.name = 'PolicyWriteRejectedError';
  }
}

export class PolicyWriteUnverifiedError extends Error {
  public readonly before: PolicyWriteIdentity;
  public readonly observed?: PolicyWriteIdentity;

  constructor(before: PolicyWriteIdentity, observed?: PolicyWriteIdentity) {
    super(POLICY_ERROR_MESSAGES.write_unverified);
    this.name = 'PolicyWriteUnverifiedError';
    this.before = before;
    if (observed !== undefined) {
      this.observed = observed;
    }
  }
}
