/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExample } from '../types';

/**
 * Placeholder QRadar rules dataset.
 *
 * TODO: Replace with real QRadar rules from Jatin. Each example needs:
 * - original_rule: QRadar XML rule (base64-decoded rule_data in query field)
 * - resources: Building blocks, QID maps, reference sets, etc.
 * - expected: Ground truth
 *
 * Categories to cover:
 * - Simple QRadar event rules (no dependencies)
 * - Rules with building block dependencies
 * - Rules with reference set dependencies (expecting LOOKUP JOIN in ESQL)
 * - Rules with QID Map Entry test conditions
 * - Rules containing unsupported constructs (Sequence, DoubleSequence, CauseAndEffect)
 * - Rules that should match prebuilt Elastic rules
 * - Rules matching specific Elastic integrations
 */
export const qradarRules: RuleExample[] = [
  {
    id: 'qradar-simple-001',
    input: {
      original_rule: {
        id: 'qradar-simple-001',
        vendor: 'qradar',
        title: 'Multiple Login Failures',
        description: 'Detects multiple failed login attempts from a single source',
        query:
          '<rule><test><and><test name="EventNameTest"><parameter id="regex" value="Failed Login"/></test><test name="LocalSourceIPTest"><parameter id="direction" value="source"/></test></and></test></rule>',
        query_language: 'xml',
      },
      resources: [],
    },
    output: {
      translation_result: 'full',
      esql_query: null,
      index_pattern: null,
      integration_id: null,
      prebuilt_rule_id: null,
      has_lookup_join: false,
      is_unsupported: false,
    },
    metadata: {
      vendor: 'qradar',
      category: 'simple',
      complexity: 'low',
    },
  },
  {
    id: 'qradar-reference-set-001',
    input: {
      original_rule: {
        id: 'qradar-reference-set-001',
        vendor: 'qradar',
        title: 'Connection to Suspicious IP from Reference Set',
        description: 'Detects connections to IPs listed in a reference set',
        query:
          '<rule><test><and><test name="ReferenceSetTest"><parameter id="name" value="Suspicious_IPs"/><parameter id="field" value="sourceip"/></test></and></test></rule>',
        query_language: 'xml',
      },
      resources: [
        {
          type: 'lookup',
          name: 'Suspicious_IPs',
          content: '192.168.1.100\n10.0.0.50',
        },
      ],
    },
    output: {
      translation_result: 'full',
      esql_query: null,
      index_pattern: null,
      integration_id: null,
      prebuilt_rule_id: null,
      has_lookup_join: true,
      is_unsupported: false,
    },
    metadata: {
      vendor: 'qradar',
      category: 'with_reference_sets',
      complexity: 'medium',
    },
  },
  {
    id: 'qradar-unsupported-001',
    input: {
      original_rule: {
        id: 'qradar-unsupported-001',
        vendor: 'qradar',
        title: 'Rule Using Sequence Function',
        description: 'Uses SequenceFunction_Test which is unsupported',
        query:
          '<rule><test><and><test name="SequenceFunction_Test"><parameter id="function" value="sequence"/></test></and></test></rule>',
        query_language: 'xml',
      },
      resources: [],
    },
    output: {
      translation_result: 'untranslatable',
      esql_query: null,
      index_pattern: null,
      integration_id: null,
      prebuilt_rule_id: null,
      has_lookup_join: false,
      is_unsupported: true,
    },
    metadata: {
      vendor: 'qradar',
      category: 'unsupported',
      complexity: 'low',
    },
  },
  {
    // Real prebuilt rule looked up via GET /api/saved_objects/_find?type=security-rule on a
    // local Kibana with the security_detection_engine package installed (2026-08-20):
    //   rule_id: e08ccd49-0380-4b2b-8d71-8000377d6e49
    //   name: "Attempts to Brute Force an Okta User Account"
    // A single obvious semantic query ("Okta account lockout brute force") should surface this
    // on the first search attempt, so this exercises the "happy path" match for both v1 and v2.
    id: 'qradar-prebuilt-match-001',
    input: {
      original_rule: {
        id: 'qradar-prebuilt-match-001',
        vendor: 'qradar',
        title: 'Okta User Account Locked After Repeated Failed Logins',
        description:
          'Detects an Okta user account being locked out multiple times within a short window due to repeated authentication failures, indicating a potential brute-force or password-spraying attack.',
        query:
          '<rule><test><and><test name="EventNameTest"><parameter id="regex" value="user.account.lock"/></test><test name="LogSourceTypeTest"><parameter id="type" value="Okta"/></test><test name="ThresholdTest"><parameter id="count" value="3"/><parameter id="window" value="10800"/></test></and></test></rule>',
        query_language: 'xml',
      },
      resources: [],
    },
    output: {
      translation_result: 'full',
      esql_query: null,
      index_pattern: null,
      integration_id: null,
      prebuilt_rule_id: 'e08ccd49-0380-4b2b-8d71-8000377d6e49',
      has_lookup_join: false,
      is_unsupported: false,
    },
    metadata: {
      vendor: 'qradar',
      category: 'prebuilt_match',
      complexity: 'low',
    },
  },
  {
    // Real prebuilt rule looked up the same way (2026-08-20):
    //   rule_id: bc9f5144-0ead-476e-ba6e-cef295601195
    //   name: "Microsoft Entra ID Impossible Travel Sign-in"
    // Deliberately avoids the phrase "impossible travel" and instead describes the underlying
    // geo-velocity/cross-region condition in QRadar test terms, so a first-pass query built from
    // the literal wording is unlikely to surface the right candidate. Finding it should require
    // the model to recognize this is an "impossible travel" pattern and reformulate the search —
    // this is designed to exercise v2's retry loop, which v1 has no equivalent of.
    id: 'qradar-prebuilt-match-002',
    input: {
      original_rule: {
        id: 'qradar-prebuilt-match-002',
        vendor: 'qradar',
        title: 'Anomalous Cross-Region Azure AD Interactive Sign-Ins for Same Identity',
        description:
          'Detects a user principal completing two successful Azure Active Directory interactive sign-ins from source locations separated by more than 500km within a 90 minute window, where the implied velocity between sign-ins exceeds physically possible travel speed.',
        query:
          '<rule><test><and><test name="EventNameTest"><parameter id="regex" value="Sign-in activity"/></test><test name="LogSourceTypeTest"><parameter id="type" value="Microsoft Entra ID"/></test><test name="ReferenceSetTest"><parameter id="name" value="AAD_Recent_SignIn_Locations"/><parameter id="field" value="userPrincipalName"/></test></and></test></rule>',
        query_language: 'xml',
      },
      resources: [
        {
          type: 'lookup',
          name: 'AAD_Recent_SignIn_Locations',
          content: 'userPrincipalName,lastLat,lastLon,lastSeen',
        },
      ],
    },
    output: {
      translation_result: 'partial',
      esql_query: null,
      index_pattern: null,
      integration_id: null,
      prebuilt_rule_id: 'bc9f5144-0ead-476e-ba6e-cef295601195',
      has_lookup_join: true,
      is_unsupported: false,
    },
    metadata: {
      vendor: 'qradar',
      category: 'prebuilt_match',
      complexity: 'high',
    },
  },
];
