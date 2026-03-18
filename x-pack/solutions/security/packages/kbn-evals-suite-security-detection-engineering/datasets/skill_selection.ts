/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const skillSelectionExamples = [
  {
    input: {
      question: 'Show me all enabled detection rules sorted by risk score',
    },
    output: {
      criteria: [
        'The response references detection rules and their properties.',
        'The response includes information about rule status and risk scores.',
      ],
      toolCalls: [
        {
          id: 'security.find_rules',
        },
      ],
    },
    metadata: { category: 'rule-search', difficulty: 'easy' },
  },
  {
    input: {
      question: 'What MITRE ATT&CK techniques do we currently have detection coverage for?',
    },
    output: {
      criteria: [
        'The response discusses MITRE ATT&CK coverage.',
        'The response references specific techniques or tactics.',
      ],
      toolCalls: [
        {
          id: 'security.coverage_overview',
        },
      ],
    },
    metadata: { category: 'coverage-analysis', difficulty: 'easy' },
  },
  {
    input: {
      question: 'Are any of our detection rules failing? Show me rules with execution errors.',
    },
    output: {
      criteria: [
        'The response discusses rule execution health.',
        'The response identifies rules with errors or performance issues.',
      ],
      toolCalls: [
        {
          id: 'security.rule_monitoring',
        },
      ],
    },
    metadata: { category: 'rule-monitoring', difficulty: 'easy' },
  },
  {
    input: {
      question:
        'I need to add an exception for the rule "Suspicious PowerShell Execution" to exclude our admin scripts.',
    },
    output: {
      criteria: [
        'The response addresses creating an exception for the specified rule.',
        'The response guides the user on defining exception conditions.',
      ],
      toolCalls: [
        {
          id: 'security.manage_exceptions',
        },
      ],
    },
    metadata: { category: 'exception-management', difficulty: 'medium' },
  },
  {
    input: {
      question:
        'Test this ES|QL detection query against the last 24 hours of data: FROM logs-endpoint.events.process-* | WHERE process.name == "mimikatz.exe"',
    },
    output: {
      criteria: [
        'The response provides results or analysis from previewing the rule query.',
        'The response discusses the query execution against live data.',
      ],
      toolCalls: [
        {
          id: 'security.preview_rule',
        },
      ],
    },
    metadata: { category: 'rule-preview', difficulty: 'medium' },
  },
  {
    input: {
      question: 'Enable all disabled rules that target credential access techniques.',
    },
    output: {
      criteria: [
        'The response addresses enabling rules related to credential access.',
        'The response references bulk rule management operations.',
      ],
      toolCalls: [
        {
          id: 'security.find_rules',
        },
        {
          id: 'security.manage_rules',
        },
      ],
    },
    metadata: { category: 'rule-management', difficulty: 'medium' },
  },
];
