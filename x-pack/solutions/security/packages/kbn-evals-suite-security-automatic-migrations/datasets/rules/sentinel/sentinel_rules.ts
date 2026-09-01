/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExample } from '../types';

/**
 * Microsoft Sentinel rules dataset.
 */
export const sentinelRules: RuleExample[] = [
  {
    // Source: aws_rules_export.arm.json / d25b1998-a592-4bc5-8a3a-92b39eedb1bc.
    // Matches Elastic "AWS IAM User Console Login Without MFA" (new_terms, f5778acd-…).
    // Both detect a non-MFA IAM console sign-in (SSO excluded); the `extend`/`summarize` tail is
    // field shaping, so the match should survive it.
    id: 'sentinel-prebuilt-match-001',
    input: {
      original_rule: {
        id: 'sentinel-prebuilt-match-001',
        vendor: 'microsoft-sentinel',
        title: 'Login to AWS Management Console without MFA',
        description:
          'Multi-Factor Authentication (MFA) helps you to prevent credential compromise. This alert identifies logins to the AWS Management Console without MFA.\nYou can limit this detection to trigger for adminsitrative accounts if you do not have MFA enabled on all accounts.\nThis is done by looking at the eventName ConsoleLogin and if the AdditionalEventData field indicates MFA was NOT used and the ResponseElements field indicates NOT a Failure. Thereby indicating that a non-MFA login was successful.',
        query: `AWSCloudTrail
| where EventName =~ "ConsoleLogin"
| extend MFAUsed = tostring(parse_json(AdditionalEventData).MFAUsed), LoginResult = tostring(parse_json(ResponseElements).ConsoleLogin), indexId = indexof(tostring(UserIdentityPrincipalid),":")
| where MFAUsed !~ "Yes" and LoginResult !~ "Failure"
| where SessionIssuerUserName !contains "AWSReservedSSO"
| extend UserIdentityArn = iif(isempty(UserIdentityArn), tostring(parse_json(Resources)[0].ARN), UserIdentityArn)
| extend UserName = tostring(split(UserIdentityArn, '/')[-1])
| extend AccountName = case( UserIdentityPrincipalid == "Anonymous", "Anonymous", isempty(UserIdentityUserName), UserName, UserIdentityUserName)
| extend AccountName = iif(AccountName contains "@", tostring(split(AccountName, '@', 0)[0]), AccountName),
  AccountUPNSuffix = iif(AccountName contains "@", tostring(split(AccountName, '@', 1)[0]), "")
| summarize StartTimeUtc = min(TimeGenerated), EndTimeUtc = max(TimeGenerated) by EventName, EventTypeName, LoginResult, MFAUsed, RecipientAccountId, AccountName, AccountUPNSuffix, UserIdentityAccountId,  UserIdentityPrincipalid, UserAgent,
UserIdentityUserName, SessionMfaAuthenticated, SourceIpAddress, AWSRegion, indexId
| extend timestamp = StartTimeUtc`,
        query_language: 'kql',
        severity: 'low',
      },
      resources: [],
    },
    output: {
      translation_result: 'full',
      esql_query: null,
      index_pattern: null,
      integration_id: null,
      prebuilt_rule_id: 'f5778acd-80e3-4ca0-a32a-6259386dfb20',
      has_lookup_join: false,
      is_unsupported: false,
    },
    metadata: {
      vendor: 'microsoft-sentinel',
      category: 'prebuilt_match',
      complexity: 'medium',
    },
  },
  {
    // Source: aws_rules_export.arm.json / 9a6554e6-63d9-4f94-9b32-64d1d40628f2.
    // Elastic "AWS IAM User Self-Created Access Key Subsequently Used" (dfb7dc0b-2caf-4186-9b59-5752bc59bc19)
    // is narrower (key used within 1h vs CreateAccessKey alone), so GT expects a custom translation.
    id: 'sentinel-translate-001',
    input: {
      original_rule: {
        id: 'sentinel-translate-001',
        vendor: 'microsoft-sentinel',
        title: 'Creation of Access Key for IAM User',
        description:
          'Establishes persistence by creating an access key on an existing IAM user. This type of action should be validated by Account Admin of AWS Account. Ref : https://stratus-red-team.cloud/attack-techniques/AWS/aws.persistence.iam-backdoor-user/',
        query: `AWSCloudTrail
| where EventName == "CreateAccessKey"
| project-away SourceSystem,Category,Type,TenantId,EventVersion,SessionIssuerAccountId
| extend UserName = substring(UserIdentityPrincipalid, indexof_regex(UserIdentityPrincipalid, ":") + 1)
| extend Name = split(UserName,'@')[0],UpnSuffix = split(UserName,'@')[1]`,
        query_language: 'kql',
        severity: 'medium',
      },
      resources: [],
    },
    output: {
      translation_result: 'full',
      // First non-null `esql_query` in the suite, so this is also the only example that activates
      // the `Custom Query Accuracy` evaluator. That evaluator scores Levenshtein similarity against
      // this string and passes at >= 0.8, so a semantically correct translation using different
      // aliases or clause order can still score low. Read it as a drift signal, not a hard verdict.
      esql_query: `FROM logs-aws.cloudtrail-*
| WHERE event.dataset == "aws.cloudtrail" AND event.action == "CreateAccessKey"
| EVAL colon_pos = LOCATE(user.id, ":")
| EVAL user_name = CASE(colon_pos > 0, SUBSTRING(user.id, colon_pos + 1), user.id)
| EVAL name = MV_FIRST(SPLIT(user_name, "@"))
| EVAL upn_suffix = MV_LAST(SPLIT(user_name, "@"))
| DROP colon_pos
| LIMIT 100`,
      index_pattern: 'logs-aws.cloudtrail-*',
      integration_id: null,
      prebuilt_rule_id: null,
      has_lookup_join: false,
      is_unsupported: false,
    },
    metadata: {
      vendor: 'microsoft-sentinel',
      category: 'simple',
      complexity: 'medium',
    },
  },
];
