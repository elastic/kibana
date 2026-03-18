/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toolInvocationExamples = [
  {
    input: {
      question: 'Find all rules of type "eql" that are currently disabled',
    },
    output: {
      criteria: ['The response lists EQL rules that are disabled.'],
      toolCalls: [
        {
          id: 'security.find_rules',
          criteria: [
            'The tool call should filter for rules with type "eql".',
            'The tool call should filter for rules that are disabled.',
          ],
        },
      ],
    },
    metadata: { category: 'tool-invocation', difficulty: 'easy' },
  },
  {
    input: {
      question:
        'Preview this KQL query for the last 7 days: host.os.type:windows AND process.name:("cmd.exe" OR "powershell.exe") AND event.action:"start"',
    },
    output: {
      criteria: [
        'The response includes a preview of the rule query results.',
        'The response discusses the number of matches found.',
      ],
      toolCalls: [
        {
          id: 'security.preview_rule',
          criteria: [
            'The tool call should use a "query" rule type with "kuery" language.',
            'The tool call should set the timeframe to cover 7 days.',
            'The tool call should include the provided KQL query.',
          ],
        },
      ],
    },
    metadata: { category: 'tool-invocation', difficulty: 'medium' },
  },
  {
    input: {
      question:
        'Get the MITRE ATT&CK coverage overview filtered to only Persistence and Privilege Escalation tactics',
    },
    output: {
      criteria: [
        'The response provides MITRE ATT&CK coverage information.',
        'The response focuses on Persistence and Privilege Escalation tactics.',
      ],
      toolCalls: [
        {
          id: 'security.coverage_overview',
          criteria: [
            'The tool call should filter by the Persistence (TA0003) and Privilege Escalation (TA0004) tactics.',
          ],
        },
      ],
    },
    metadata: { category: 'tool-invocation', difficulty: 'medium' },
  },
  {
    input: {
      question:
        'Check if there are any duplicate or overlapping exceptions across our rules for the process "svchost.exe"',
    },
    output: {
      criteria: [
        'The response addresses exception overlap analysis.',
        'The response discusses exceptions related to svchost.exe.',
      ],
      toolCalls: [
        {
          id: 'security.manage_exceptions',
          criteria: [
            'The tool call should use the find_overlaps or find operation.',
            'The tool call should reference svchost.exe in the query parameters.',
          ],
        },
      ],
    },
    metadata: { category: 'tool-invocation', difficulty: 'hard' },
  },
  {
    input: {
      question: 'Show me rules that have been failing in the last 24 hours with gap-related issues',
    },
    output: {
      criteria: [
        'The response identifies rules with execution issues.',
        'The response discusses gap-related problems in rule execution.',
      ],
      toolCalls: [
        {
          id: 'security.rule_monitoring',
          criteria: [
            'The tool call should request rules with errors or warnings.',
            'The tool call should filter for recent timeframe (last 24 hours).',
          ],
        },
      ],
    },
    metadata: { category: 'tool-invocation', difficulty: 'medium' },
  },
];
