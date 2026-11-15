/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageExample, CoverageIndicator } from '../src/types';
import type { FixtureRule } from '../src/fixture_rules';

const ENDPOINT_PROCESS_INDEX = 'logs-endpoint.events.process-*';
const WINDOWS_SECURITY_INDEX = 'winlogbeat-*';

/**
 * Custom rules installed before the verdict examples run. Each prebuilt look-alike in the
 * catalog is listed as a decoy on the examples: an installed rule is the cheaper fix, so
 * suggesting the catalog rule instead is wrong.
 */
export const FIXTURE_RULES: FixtureRule[] = [
  {
    ruleId: '4ed815ca-0870-4e0b-8173-ed0786cd71e8',
    name: 'Encoded PowerShell Command on Windows Endpoints',
    description: 'Detects PowerShell started with an encoded command on Windows endpoints.',
    query: 'process.name:powershell.exe and process.args:*-enc*',
    index: ENDPOINT_PROCESS_INDEX,
    enabled: true,
    tactic: { id: 'TA0002', name: 'Execution' },
    technique: { id: 'T1059', name: 'Command and Scripting Interpreter' },
  },
  {
    ruleId: '2f7ba958-1687-44db-a359-32a9b9295add',
    name: 'Office Spawning Windows Command Shell',
    description: 'Detects winword.exe or excel.exe starting cmd.exe on Windows endpoints.',
    query: 'process.parent.name:("winword.exe" or "excel.exe") and process.name:cmd.exe',
    index: ENDPOINT_PROCESS_INDEX,
    enabled: true,
    tactic: { id: 'TA0002', name: 'Execution' },
    technique: { id: 'T1059', name: 'Command and Scripting Interpreter' },
  },
  {
    ruleId: 'c678f2a7-46c6-4968-bf84-da0432ca4d5d',
    name: 'SMB Admin Share Lateral Movement (Event 5145)',
    description: 'Detects access to the C$ and ADMIN$ shares between Windows hosts.',
    query: 'event.code:5145 and winlog.event_data.ShareName:(*C$ or *ADMIN$)',
    index: WINDOWS_SECURITY_INDEX,
    enabled: false,
    tactic: { id: 'TA0008', name: 'Lateral Movement' },
    technique: { id: 'T1021', name: 'Remote Services' },
  },
  {
    ruleId: 'b7151138-868d-453a-b1cd-b202726ab58a',
    name: 'Crontab Modified by Web Server Account',
    description: 'Detects crontab run by a web server account on Linux hosts.',
    query: 'process.name:crontab and user.name:("www-data" or "apache" or "nginx")',
    index: ENDPOINT_PROCESS_INDEX,
    enabled: false,
    tactic: { id: 'TA0003', name: 'Persistence' },
    technique: { id: 'T1053', name: 'Scheduled Task/Job' },
  },
];

const [powershellRule, officeRule, smbRule, crontabRule] = FIXTURE_RULES;

/** Builds an indicator in the shape the hunt producer writes. */
const gap = ({
  title,
  threat,
  techniques,
  dataSources,
  severity,
  excerpt,
}: {
  title: string;
  threat: string;
  techniques: Array<{ id: string; name: string }>;
  dataSources: string[];
  severity: string;
  excerpt?: string;
}): CoverageIndicator => {
  const summary = title.replace(/^.*?\(T[\d.]+\): /, '');
  return {
    type: 'security.coverage',
    title,
    description: `${summary}. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.`,
    content: [
      `Threat:\n${threat}`,
      `Techniques: ${techniques.map(({ id, name }) => `${id} ${name}`).join('; ')}`,
      `Data sources: ${dataSources.join(', ')}`,
      `Severity: ${severity}`,
      'ES|QL: not executed',
      ...(excerpt ? [`Report excerpt:\n"${excerpt}"`] : []),
      'Coverage status: no detection rule is currently mapped to this threat.',
    ].join('\n\n'),
    tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
    attributes: {
      technique: techniques[0].id,
      all_techniques: techniques.map(({ id }) => id),
      severity,
      data_sources: dataSources,
      esql_status: 'not_executed',
    },
    references: dataSources.map((dataSource) => ({
      uri: `index://${dataSource}`,
      relation: 'derived_from',
      description: 'Data source named by the gap',
    })),
  };
};

/**
 * One example for each verdict other than `prebuilt_available`. The world is the
 * FIXTURE_RULES set plus the Elastic prebuilt catalog.
 */
export const verdictDataset: CoverageExample[] = [
  {
    input: {
      gapId: 'VD-01',
      indicator: gap({
        title: 'PowerShell (T1059.001): Encoded PowerShell commands on Windows workstations',
        threat:
          'Operators start powershell.exe with -EncodedCommand and a Base64 script block on Windows workstations, so the download cradle does not show in the command line.',
        techniques: [
          { id: 'T1059.001', name: 'PowerShell' },
          { id: 'T1027', name: 'Obfuscated Files or Information' },
        ],
        dataSources: [ENDPOINT_PROCESS_INDEX],
        severity: 'high',
        excerpt:
          'powershell.exe -nop -w hidden -enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0AA==',
      }),
    },
    output: {
      verdict: 'covered_enabled',
      primaryRule: { ruleId: powershellRule.ruleId, name: powershellRule.name },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Long Base64 Encoded Command via Scripting Interpreter',
        'PowerShell Suspicious Payload Encoded and Compressed',
      ],
    },
    metadata: {
      difficulty: 'easy',
      whatItTests: 'An enabled installed rule matches. Prebuilt look-alikes exist in the catalog.',
      passCriteria: 'covered_enabled with the installed rule.',
    },
  },
  {
    input: {
      gapId: 'VD-02',
      indicator: gap({
        title:
          'Phishing: Spearphishing Attachment (T1566.001): Word and Excel documents start a Windows command shell',
        threat:
          'Macro documents delivered by email make winword.exe or excel.exe start cmd.exe, which then runs a staging script from the user profile.',
        techniques: [
          { id: 'T1566.001', name: 'Spearphishing Attachment' },
          { id: 'T1059.003', name: 'Windows Command Shell' },
        ],
        dataSources: [ENDPOINT_PROCESS_INDEX],
        severity: 'high',
      }),
    },
    output: {
      verdict: 'covered_enabled',
      primaryRule: { ruleId: officeRule.ruleId, name: officeRule.name },
      alternateRuleNames: [],
      decoyRuleNames: ['Suspicious MS Office Child Process'],
    },
    metadata: {
      difficulty: 'easy',
      whatItTests:
        'An enabled installed rule matches. A broader prebuilt rule exists in the catalog.',
      passCriteria: 'covered_enabled with the installed rule.',
    },
  },
  {
    input: {
      gapId: 'VD-03',
      indicator: gap({
        title:
          'Remote Services: SMB/Windows Admin Shares (T1021.002): Excel starts cmd.exe after a user opens an invoice attachment',
        threat:
          'A user opens an invoice workbook from email. excel.exe starts cmd.exe, which writes a batch file to the temp folder and runs it.',
        techniques: [{ id: 'T1021.002', name: 'SMB/Windows Admin Shares' }],
        dataSources: [ENDPOINT_PROCESS_INDEX],
        severity: 'medium',
      }),
    },
    output: {
      verdict: 'covered_enabled',
      primaryRule: { ruleId: officeRule.ruleId, name: officeRule.name },
      alternateRuleNames: [],
      decoyRuleNames: [smbRule.name, 'Suspicious MS Office Child Process'],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests:
        'The technique label (SMB admin shares) does not match the content (Office starts cmd.exe). The content decides.',
      passCriteria: 'covered_enabled with the Office rule. The SMB rule is a fail.',
    },
  },
  {
    input: {
      gapId: 'VD-04',
      indicator: gap({
        title:
          'Remote Services: SMB/Windows Admin Shares (T1021.002): Lateral movement through the C$ and ADMIN$ shares',
        threat:
          'After credential theft, the operator copies tools to other Windows hosts through the C$ and ADMIN$ shares and starts them as services. Windows Security event 5145 records each share access.',
        techniques: [
          { id: 'T1021.002', name: 'SMB/Windows Admin Shares' },
          { id: 'T1570', name: 'Lateral Tool Transfer' },
        ],
        dataSources: [WINDOWS_SECURITY_INDEX],
        severity: 'high',
      }),
    },
    output: {
      verdict: 'covered_disabled',
      primaryRule: { ruleId: smbRule.ruleId, name: smbRule.name },
      alternateRuleNames: [],
      decoyRuleNames: ['Potential Lateral Tool Transfer via SMB Share'],
    },
    metadata: {
      difficulty: 'easy',
      whatItTests: 'A disabled installed rule matches. Enabling it is the fix.',
      passCriteria: 'covered_disabled with the installed rule.',
    },
  },
  {
    input: {
      gapId: 'VD-05',
      indicator: gap({
        title:
          'Scheduled Task/Job: Cron (T1053.003): Web shell operators add cron jobs as the web server account',
        threat:
          'Through a web shell on a Linux web server, the operator runs crontab as www-data to add a job that starts a reverse shell every five minutes.',
        techniques: [
          { id: 'T1053.003', name: 'Cron' },
          { id: 'T1505.003', name: 'Web Shell' },
        ],
        dataSources: [ENDPOINT_PROCESS_INDEX],
        severity: 'high',
      }),
    },
    output: {
      verdict: 'covered_disabled',
      primaryRule: { ruleId: crontabRule.ruleId, name: crontabRule.name },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Suspicious CronTab Creation or Modification',
        'Cron Job Created or Modified',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests:
        'A disabled installed rule matches, and prebuilt cron rules exist in the catalog. Enabling the installed rule is cheaper than installing one.',
      passCriteria: 'covered_disabled with the installed rule.',
    },
  },
  {
    input: {
      gapId: 'VD-06',
      indicator: gap({
        title:
          'Data from Information Repositories (T1213): Payroll service account exports bank details in bulk',
        threat:
          'The svc-payroll-sync service account exported more than 500 employee bank-detail records in one hour through the internal HR portal API. Normal use is under 20 records a day. Only the HR portal audit log records these exports.',
        techniques: [{ id: 'T1213', name: 'Data from Information Repositories' }],
        dataSources: ['logs-hrportal.audit-*'],
        severity: 'high',
      }),
    },
    output: {
      verdict: 'no_coverage',
      alternateRuleNames: [],
      decoyRuleNames: [],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'No installed or prebuilt rule reads this internal audit log.',
      passCriteria: 'no_coverage.',
    },
  },
  {
    input: {
      gapId: 'VD-07',
      indicator: gap({
        title: 'Command and Scripting Interpreter (T1059): Suspicious activity on several hosts',
        threat:
          'Several hosts showed suspicious activity during the review window. The hunt did not record which processes, users or commands were involved.',
        techniques: [{ id: 'T1059', name: 'Command and Scripting Interpreter' }],
        dataSources: [ENDPOINT_PROCESS_INDEX],
        severity: 'low',
      }),
    },
    output: {
      verdict: 'no_coverage',
      alternateRuleNames: [],
      decoyRuleNames: [powershellRule.name, officeRule.name],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests:
        'The gap names no behavior, only a technique that two enabled rules carry. A technique match alone is not coverage.',
      passCriteria: 'no_coverage.',
    },
  },
];
