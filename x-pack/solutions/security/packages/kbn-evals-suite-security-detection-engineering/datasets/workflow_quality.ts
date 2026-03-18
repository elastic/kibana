/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const workflowQualityExamples = [
  {
    input: {
      question:
        'I want to improve our detection coverage for Lateral Movement techniques. Analyze what we have now, identify gaps, and suggest what prebuilt rules we should enable.',
    },
    output: {
      criteria: [
        'The response analyzes current MITRE ATT&CK coverage for Lateral Movement.',
        'The response identifies specific gaps in detection coverage.',
        'The response recommends prebuilt rules to fill the gaps.',
        'The response provides actionable steps to improve coverage.',
      ],
      toolCalls: [{ id: 'security.coverage_overview' }, { id: 'security.find_rules' }],
    },
    metadata: { category: 'e2e-workflow', difficulty: 'hard' },
  },
  {
    input: {
      question:
        'The rule "Brute Force Detected" is generating too many false positives. Help me investigate why and tune it — check its recent execution, find any existing exceptions, and suggest improvements.',
    },
    output: {
      criteria: [
        'The response investigates the noisy rule by checking its execution health.',
        'The response examines existing exceptions for the rule.',
        'The response provides specific tuning recommendations.',
        'The response offers actionable steps to reduce false positives.',
      ],
      toolCalls: [
        { id: 'security.find_rules' },
        { id: 'security.rule_monitoring' },
        { id: 'security.manage_exceptions' },
      ],
    },
    metadata: { category: 'e2e-workflow', difficulty: 'hard' },
  },
  {
    input: {
      question:
        'We just got new endpoint logs from a Linux fleet. Help me set up detection coverage: check what prebuilt rules are available for Linux, review our current coverage gaps for Initial Access and Execution on Linux, and install relevant prebuilt rules.',
    },
    output: {
      criteria: [
        'The response identifies prebuilt rules relevant to Linux endpoints.',
        'The response analyzes MITRE coverage gaps for Initial Access and Execution.',
        'The response suggests installing specific prebuilt rules.',
        'The response considers the Linux platform context throughout.',
      ],
      toolCalls: [
        { id: 'security.find_rules' },
        { id: 'security.coverage_overview' },
        { id: 'security.manage_rules' },
      ],
    },
    metadata: { category: 'e2e-workflow', difficulty: 'hard' },
  },
  {
    input: {
      question:
        'Give me a health check on all our active detection rules — find any that are failing, have performance issues, or have gap warnings. Prioritize the critical and high severity ones.',
    },
    output: {
      criteria: [
        'The response provides a health overview of active detection rules.',
        'The response identifies failing rules and performance issues.',
        'The response prioritizes critical and high severity rules.',
        'The response suggests remediation steps for unhealthy rules.',
      ],
      toolCalls: [{ id: 'security.rule_monitoring' }, { id: 'security.find_rules' }],
    },
    metadata: { category: 'e2e-workflow', difficulty: 'medium' },
  },
];
