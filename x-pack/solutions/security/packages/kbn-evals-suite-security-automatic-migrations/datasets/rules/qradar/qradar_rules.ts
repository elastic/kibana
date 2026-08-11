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
];
