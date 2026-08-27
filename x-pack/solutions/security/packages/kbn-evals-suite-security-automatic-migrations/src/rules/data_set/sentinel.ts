/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleFixture } from './types';

export const sentinelPrebuiltRules: PrebuiltRuleFixture[] = [
  {
    // sentinel-prebuilt-match-001
    ruleId: 'f5778acd-80e3-4ca0-a32a-6259386dfb20',
    name: 'AWS IAM User Console Login Without MFA',
    description:
      "Identifies the first observed occurrence, within the configured New Terms history window, of a regular IAM user successfully signing in to the AWS Management Console without multi-factor authentication. A password alone is a weaker control than password-plus-MFA, and an adversary who has phished, guessed, or otherwise obtained a user's password can sign in directly if MFA is not enforced for that user. This rule is scoped to standard IAM users only; it excludes the AWS root user (covered by a dedicated rule) and federated/SSO sign-ins (covered by a dedicated rule that also accounts for IdP-side MFA), since MFAUsed: No is expected in both of those cases for reasons unrelated to this gap.",
    mitreAttackIds: ['T1078', 'T1078.004'],
  },
];
