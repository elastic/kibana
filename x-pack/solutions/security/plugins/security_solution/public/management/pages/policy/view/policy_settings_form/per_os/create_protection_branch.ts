/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PolicyProtection } from '../../../types';

/**
 * Protections the server's license validation reads a `supported` flag from. `malware` carries no
 * such flag, so writing one would add a field the policy type does not have.
 */
const HAS_SUPPORTED_FLAG: Record<PolicyProtection, boolean> = {
  malware: false,
  memory_protection: true,
  behavior_protection: true,
  ransomware: true,
};

export interface CreatedProtectionBranch {
  mode: ProtectionModes;
  supported?: boolean;
}

/**
 * Builds the branch to store for a protection the policy does not carry yet.
 *
 * A policy written before a protection shipped has no object for it, and a bare `{ mode }` cannot
 * be saved: `isEndpointPolicyValidForLicense` compares `supported` by strict equality against the
 * license default, so an absent flag fails validation at every tier. The default is `true` for
 * Platinum and above and `false` below, which is what `policyFactoryWithSupportedFeatures` and
 * `policyFactoryWithoutPaidFeatures` encode.
 */
export const createProtectionBranch = (
  protection: PolicyProtection,
  mode: ProtectionModes,
  isPlatinumPlus: boolean
): CreatedProtectionBranch =>
  HAS_SUPPORTED_FLAG[protection] ? { mode, supported: isPlatinumPlus } : { mode };
