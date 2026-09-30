/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProtectionModes } from '../../../../../../../common/endpoint/types';
import {
  DefaultPolicyNotificationMessage,
  DefaultPolicyRuleNotificationMessage,
} from '../../../../../../../common/endpoint/models/policy_config';
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

/**
 * Default notification text per protection. Rule-based protections name the rule that fired,
 * the file-based ones name the file, which is what `policyFactory` seeds.
 */
const DEFAULT_NOTIFICATION_MESSAGE: Record<PolicyProtection, string> = {
  malware: DefaultPolicyNotificationMessage,
  ransomware: DefaultPolicyNotificationMessage,
  memory_protection: DefaultPolicyRuleNotificationMessage,
  behavior_protection: DefaultPolicyRuleNotificationMessage,
};

export interface CreatedPopupBranch {
  enabled: boolean;
  message: string;
}

/**
 * Builds the notification branch to store when the policy carries none.
 *
 * `PolicyConfig` requires both `enabled` and `message` on every non-device popup branch, and a
 * policy that set a mode through the 9.4 advanced field never wrote one. Seeding only `enabled`
 * would emit a notification with no text for the endpoint to render.
 */
export const createPopupBranch = (
  protection: PolicyProtection,
  enabled: boolean
): CreatedPopupBranch => ({ enabled, message: DEFAULT_NOTIFICATION_MESSAGE[protection] });
