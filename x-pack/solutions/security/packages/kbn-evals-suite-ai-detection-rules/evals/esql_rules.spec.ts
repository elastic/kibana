/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { createEvaluateAiRulesDataset } from '../src/evaluate_dataset';

// Inline dataset - ESQL detection rules from elastic/detection-rules
const esqlRulesDataset = [
  {
    input: {
      prompt: 'Create a rule that detects rare Azure activity log actions for a specific country. Use ES|QL and include ATT&CK mappings.',
    },
    output: {
      expectedRule: {
        name: 'Azure Activity Logs Rare Event Action For A Country',
        description: 'Detects rare activity log actions by country in Azure environments using ES|QL.',
        query: 'FROM .alerts-security.* METADATA _id, _version, _index | WHERE event.dataset == "azure.activitylogs" | STATS action_count = COUNT(*) BY event.action, source.geo.country_name | WHERE action_count < 5',
        severity: 'low',
        risk_score: 21,
        tags: ['Azure', 'Cloud', 'ES|QL'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0001', name: 'Initial Access' },
          },
        ],
      },
    },
    metadata: {
      source: 'elastic/detection-rules',
      ruleId: 'azure_activitylogs_rare_event_action_for_a_country',
    },
  },
  {
    input: {
      prompt: 'Generate an ESQL detection rule for suspicious PowerShell script execution on Windows endpoints.',
    },
    output: {
      expectedRule: {
        name: 'Windows Execution Posh Malicious Script Aggregate',
        description: 'Detect suspicious PowerShell execution behavior that indicates potential malicious script activity.',
        query: 'FROM logs-endpoint.events.process-* METADATA _id, _version, _index | WHERE process.name == "powershell.exe" AND process.command_line IS NOT NULL | WHERE process.command_line LIKE "*EncodedCommand*" OR process.command_line LIKE "*Invoke-Expression*" | STATS executions = COUNT(*) BY host.name, user.name, process.command_line | WHERE executions >= 3',
        severity: 'medium',
        risk_score: 47,
        tags: ['Windows', 'Execution', 'PowerShell', 'ES|QL'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0002', name: 'Execution' },
          },
        ],
      },
    },
    metadata: {
      source: 'elastic/detection-rules',
      ruleId: 'execution_posh_malicious_script_agg',
    },
  },
  {
    input: {
      prompt: 'Create an ESQL rule that detects rare parent-child process relationships in Windows process events.',
    },
    output: {
      expectedRule: {
        name: 'Windows Rare Parent Child Process Relationship',
        description: 'Identifies unusual parent-child process relationships that may indicate suspicious execution chains.',
        query: 'FROM logs-endpoint.events.process-* METADATA _id, _version, _index | WHERE event.category == "process" | STATS relationship_count = COUNT(*) BY process.parent.name, process.name, host.name | WHERE relationship_count < 3',
        severity: 'medium',
        risk_score: 47,
        tags: ['Windows', 'Process', 'Behavior', 'ES|QL'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0005', name: 'Defense Evasion' },
          },
        ],
      },
    },
    metadata: {
      source: 'elastic/detection-rules',
      ruleId: 'windows_rare_parent_child_process_relationship',
    },
  },
  {
    input: {
      prompt: 'Build an ESQL rule to catch uncommon scheduled task creation activity on Windows hosts.',
    },
    output: {
      expectedRule: {
        name: 'Windows Rare Scheduled Task Creation',
        description: 'Detects unusual scheduled task creation events that can indicate persistence activity.',
        query: 'FROM logs-windows.sysmon_operational-* METADATA _id, _version, _index | WHERE event.code == "1" AND process.name == "schtasks.exe" | STATS task_creations = COUNT(*) BY host.name, user.name, process.command_line | WHERE task_creations < 4',
        severity: 'low',
        risk_score: 21,
        tags: ['Windows', 'Persistence', 'Scheduled Tasks', 'ES|QL'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0003', name: 'Persistence' },
          },
        ],
      },
    },
    metadata: {
      source: 'elastic/detection-rules',
      ruleId: 'windows_rare_scheduled_task_creation',
    },
  },
  {
    input: {
      prompt: 'Create an ESQL detection rule for suspicious script interpreter usage by Office parent processes.',
    },
    output: {
      expectedRule: {
        name: 'Windows Office Child Process Script Interpreter',
        description: 'Detects script interpreters launched by Microsoft Office processes, which may indicate malicious macros.',
        query: 'FROM logs-endpoint.events.process-* METADATA _id, _version, _index | WHERE process.parent.name IN ("WINWORD.EXE","EXCEL.EXE","POWERPNT.EXE") | WHERE process.name IN ("powershell.exe","cmd.exe","wscript.exe","cscript.exe") | STATS launches = COUNT(*) BY host.name, user.name, process.parent.name, process.name, process.command_line | WHERE launches >= 1',
        severity: 'high',
        risk_score: 73,
        tags: ['Windows', 'Execution', 'Office', 'Script Interpreter', 'ES|QL'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0002', name: 'Execution' },
          },
        ],
      },
    },
    metadata: {
      source: 'elastic/detection-rules',
      ruleId: 'windows_office_child_process_script_interpreter',
    },
  },
];

const evaluateExtended = evaluate.extend<
  {},
  { evaluateDataset: ReturnType<typeof createEvaluateAiRulesDataset> }
>({
  evaluateDataset: [
    ({ ruleCreationClient, executorClient, evaluators }, use) => {
      use(createEvaluateAiRulesDataset({ ruleCreationClient, executorClient, evaluators }));
    },
    { scope: 'test' },
  ],
});

evaluateExtended.describe(
  'AI ESQL Rule Creation',
  { tag: [...tags.serverless.security.complete] },
  () => {
    evaluateExtended('Generate ESQL detection rules', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'security-ai-rules: esql-detection-rule-generation',
          description: 'Evaluate AI generated ESQL detection rules against known expected rules from elastic/detection-rules.',
          examples: esqlRulesDataset,
        },
      });
    });
  }
);
