/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExample } from '../types';

/**
 * Placeholder Splunk SPL rules dataset.
 *
 * TODO: Replace with real rules from Jatin. Each example needs:
 * - original_rule: Real Splunk SPL detection rule
 * - resources: Macro/lookup definitions the rule references
 * - expected: Ground truth (expected ESQL, integration, prebuilt match, etc.)
 *
 * Categories to cover:
 * - Simple SPL rules (no macros/lookups)
 * - Rules with macro and/or lookup dependencies that can be resolved
 * - Rules with inputlookup or other unsupported constructs
 * - Rules that should match prebuilt Elastic rules
 * - Rules with lookup dependencies expecting LOOKUP JOIN in ESQL
 * - Rules matching specific Elastic integrations
 */
export const splunkRules: RuleExample[] = [
  {
    id: 'splunk-simple-001',
    input: {
      original_rule: {
        id: 'splunk-simple-001',
        vendor: 'splunk',
        title: 'High Number of Failed Logins',
        description: 'Detects brute force attempts via excessive failed logins',
        query:
          'index=main sourcetype=WinEventLog EventCode=4625 | stats count by src_ip | where count > 10',
        query_language: 'spl',
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
      vendor: 'splunk',
      category: 'simple',
      complexity: 'low',
    },
  },
  {
    id: 'splunk-lookup-001',
    input: {
      original_rule: {
        id: 'splunk-lookup-001',
        vendor: 'splunk',
        title: 'Connection to Known Malicious IP',
        description: 'Detects network connections to IPs in the threat intelligence lookup',
        query:
          'index=main sourcetype=firewall | lookup threat_intel_ip ip AS dest_ip OUTPUT threat_category | where isnotnull(threat_category)',
        query_language: 'spl',
      },
      resources: [
        {
          type: 'lookup',
          name: 'threat_intel_ip',
          content: 'ip,threat_category\n192.168.1.100,malware\n10.0.0.50,c2',
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
      vendor: 'splunk',
      category: 'with_lookups',
      complexity: 'medium',
    },
  },
  {
    id: 'splunk-unsupported-001',
    input: {
      original_rule: {
        id: 'splunk-unsupported-001',
        vendor: 'splunk',
        title: 'Rule Using inputlookup',
        description: 'Uses inputlookup which is unsupported for translation',
        query:
          '| inputlookup my_static_list.csv | join src_ip [search index=main sourcetype=firewall]',
        query_language: 'spl',
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
      vendor: 'splunk',
      category: 'unsupported',
      complexity: 'low',
    },
  },
];
