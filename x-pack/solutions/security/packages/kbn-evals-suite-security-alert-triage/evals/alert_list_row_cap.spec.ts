/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The criteria do not name the seeded hosts, users or rules. In a project that holds other high
 * severity alerts, the answer can correctly list those too, and the row limit can hide the seeded
 * ones. The row and note evaluators count what the model received, whatever the alerts are.
 *
 * List-style alert question eval: asks the agent to list alerts with no attachment, against more
 * alerts than the security.alerts row cap. It checks how many rows the model receives from
 * security.alerts, and that it is told when the rows were cut (security-team#20696).
 */

import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { evaluate as base } from '../src/evaluate';
import { createEvaluateConverse } from '../src/evaluate_converse';
import {
  createAlertDetailEvaluator,
  createAlertRowsEvaluator,
  createSkillLoadedEvaluator,
  createToolUsageEvaluators,
} from '../src/evaluators';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const LIST_ALERT_ID_PREFIX = 'list-triage-eval-alert-';
const LIST_ALERT_COUNT = 120;

const hex = (seed: number, length: number) =>
  Array.from({ length }, (_, i) => ((seed * 31 + i * 17) % 16).toString(16)).join('');

// Fills most of the fields the security.alerts tool asks for, with realistic lengths, so that the
// rows cost about as many tokens as real endpoint alerts.
const buildListAlertDoc = (index: number) => {
  const host = `list-eval-host-${index % 12}`;
  const user = `list-eval-user-${index % 5}`;
  const ruleIndex = index % 6;
  const sha256 = hex(index, 64);
  return {
    '@timestamp': new Date(Date.now() - (index + 1) * 5 * 60 * 1000).toISOString(),
    message: `Endpoint alert: suspicious process activity detected on ${host} by ${user}`,
    'host.name': host,
    'host.ip': [
      `10.20.${index % 12}.${10 + (index % 200)}`,
      `fe80::${hex(index, 4)}:${hex(index + 1, 4)}`,
    ],
    'host.os.name': 'Windows',
    'host.os.version': '10.0.22631.4460',
    'host.risk.calculated_level': 'High',
    'host.risk.calculated_score_norm': 78,
    'user.name': user,
    'user.domain': 'LIST-EVAL-CORP',
    'user.risk.calculated_level': 'Moderate',
    'user.risk.calculated_score_norm': 52,
    'agent.id': `agent-${hex(index, 24)}`,
    'process.name': 'powershell.exe',
    'process.pid': 4000 + index,
    'process.args': [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-EncodedCommand',
      hex(index, 96),
    ],
    'process.command_line': `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${hex(
      index,
      96
    )}`,
    'process.executable': 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'process.exit_code': 0,
    'process.working_directory': `C:\\Users\\${user}\\AppData\\Local\\Temp`,
    'process.pe.original_file_name': 'PowerShell.EXE',
    'process.hash.md5': hex(index + 3, 32),
    'process.hash.sha1': hex(index + 5, 40),
    'process.hash.sha256': sha256,
    'process.code_signature.exists': true,
    'process.code_signature.status': 'trusted',
    'process.code_signature.subject_name': 'Microsoft Windows',
    'process.code_signature.trusted': true,
    'process.parent.name': 'cmd.exe',
    'process.parent.args': ['C:\\Windows\\System32\\cmd.exe', '/c', 'start /min updater.bat'],
    'process.parent.args_count': 3,
    'process.parent.command_line': 'C:\\Windows\\System32\\cmd.exe /c start /min updater.bat',
    'process.parent.executable': 'C:\\Windows\\System32\\cmd.exe',
    'process.parent.code_signature.exists': true,
    'process.parent.code_signature.status': 'trusted',
    'process.parent.code_signature.subject_name': 'Microsoft Windows',
    'process.parent.code_signature.trusted': true,
    'file.name': `payload_${index}.dll`,
    'file.path': `C:\\Users\\${user}\\AppData\\Local\\Temp\\payload_${index}.dll`,
    'file.hash.sha256': hex(index + 9, 64),
    'source.ip': `10.20.${index % 12}.${10 + (index % 200)}`,
    'destination.ip': `203.0.113.${1 + (index % 250)}`,
    'network.protocol': 'https',
    'dns.question.name': `update-${hex(index, 8)}.example-c2.test`,
    'dns.question.type': 'A',
    'event.category': ['process'],
    'event.action': 'start',
    'event.type': ['start'],
    'event.code': '1',
    'event.dataset': 'endpoint.events.process',
    'event.module': 'endpoint',
    'event.outcome': 'success',
    'rule.name': `List eval suspicious activity rule ${ruleIndex}`,
    'kibana.alert.uuid': `${LIST_ALERT_ID_PREFIX}${index}`,
    'kibana.alert.original_time': new Date(Date.now() - (index + 1) * 5 * 60 * 1000).toISOString(),
    'kibana.alert.severity': 'high',
    'kibana.alert.risk_score': 73,
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.reason': `process event with process powershell.exe, parent process cmd.exe, by ${user} on ${host} created high alert List eval suspicious activity rule ${ruleIndex}.`,
    'kibana.alert.rule.name': `List eval suspicious activity rule ${ruleIndex}`,
    'kibana.alert.rule.rule_id': `list-eval-rule-${ruleIndex}`,
    'kibana.alert.rule.description':
      'Identifies the execution of PowerShell with an encoded command and execution policy bypass, started from a script interpreter. Adversaries use encoded commands to hide the real payload from simple command line inspection.',
    'kibana.alert.rule.category': 'Custom Query',
    'kibana.alert.rule.references': [
      'https://attack.mitre.org/techniques/T1059/001/',
      'https://www.elastic.co/security-labs/invisible-miners-unveiling-ghostengine',
    ],
    'kibana.alert.rule.threat.framework': 'MITRE ATT&CK',
    'kibana.alert.rule.threat.tactic.id': 'TA0002',
    'kibana.alert.rule.threat.tactic.name': 'Execution',
    'kibana.alert.rule.threat.tactic.reference': 'https://attack.mitre.org/tactics/TA0002/',
    'kibana.alert.rule.threat.technique.id': 'T1059',
    'kibana.alert.rule.threat.technique.name': 'Command and Scripting Interpreter',
    'kibana.alert.rule.threat.technique.reference': 'https://attack.mitre.org/techniques/T1059/',
    'kibana.alert.rule.threat.technique.subtechnique.id': 'T1059.001',
    'kibana.alert.rule.threat.technique.subtechnique.name': 'PowerShell',
    'kibana.alert.rule.threat.technique.subtechnique.reference':
      'https://attack.mitre.org/techniques/T1059/001/',
    'threat.framework': 'MITRE ATT&CK',
    'threat.tactic.id': 'TA0002',
    'threat.tactic.name': 'Execution',
    'threat.tactic.reference': 'https://attack.mitre.org/tactics/TA0002/',
    'threat.technique.id': 'T1059',
    'threat.technique.name': 'Command and Scripting Interpreter',
    'threat.technique.reference': 'https://attack.mitre.org/techniques/T1059/',
    'threat.technique.subtechnique.id': 'T1059.001',
    'threat.technique.subtechnique.name': 'PowerShell',
    'threat.technique.subtechnique.reference': 'https://attack.mitre.org/techniques/T1059/001/',
  };
};

type EvaluateAlertList = ReturnType<typeof createEvaluateConverse>;

const evaluate = base.extend<{ evaluateAlertList: EvaluateAlertList }, {}>({
  evaluateAlertList: [
    ({ fetch, connector, evaluators, executorClient, log }, use) => {
      use(
        createEvaluateConverse({
          fetch,
          connector,
          evaluators,
          executorClient,
          log,
          extraEvaluators: [
            ...createToolUsageEvaluators(log),
            createAlertRowsEvaluator(log),
            createAlertDetailEvaluator(log),
            createSkillLoadedEvaluator('alert-analysis'),
          ],
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Security Alert Triage — alert list',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate.beforeAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      log.info(`Indexing ${LIST_ALERT_COUNT} list eval alerts into ${ALERTS_INDEX}`);

      const response = await esClient.bulk({
        refresh: 'wait_for',
        operations: Array.from({ length: LIST_ALERT_COUNT }, (_, index) => [
          { index: { _index: ALERTS_INDEX, _id: `${LIST_ALERT_ID_PREFIX}${index}` } },
          buildListAlertDoc(index),
        ]).flat(),
      });

      if (response.errors) {
        const failed = response.items.filter((item) => item.index?.error);
        throw new Error(
          `Failed to set up list eval alerts: ${JSON.stringify(failed.map((f) => f.index?.error))}`
        );
      }
    });

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      log.info('Deleting list eval alerts');

      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { prefix: { 'kibana.alert.uuid': LIST_ALERT_ID_PREFIX } },
      });
    });

    evaluate(
      'Alert list — high severity alerts from the last 24 hours',
      async ({ evaluateAlertList }) => {
        await evaluateAlertList({
          dataset: {
            name: 'agent builder: security-alert-triage-alert-list',
            description:
              'Asks for a list of high severity alerts when more alerts exist than the security.alerts ' +
              'row cap. Checks the number of rows the model receives and that it is told when rows are cut.',
            examples: [
              {
                input: { question: 'List the high severity alerts from the last 24 hours.' },
                output: {
                  expected:
                    'The response lists or summarizes high severity alerts, and says so when ' +
                    'only part of the alerts is shown.',
                },
              },
            ],
          },
          criteria: [
            'The response lists or summarizes high severity alerts',
            'If the response shows only part of the alerts, it says that the list is partial',
          ],
        });
      }
    );

    // Why: the process command line is not in the summary fields. The model must ask for full detail to
    // answer, so this checks that it does not use summary for an analysis question.
    evaluate(
      'Alert analysis — PowerShell command lines from the last 24 hours',
      async ({ evaluateAlertList }) => {
        await evaluateAlertList({
          dataset: {
            name: 'agent builder: security-alert-triage-alert-analysis-detail',
            description:
              'Asks for the command lines of PowerShell alerts. The model needs the process fields, ' +
              'so it must ask security.alerts for full detail and not for the summary.',
            examples: [
              {
                input: {
                  question:
                    'Which alerts from the last 24 hours ran PowerShell with an encoded command? Show the command line of a few of them.',
                },
                output: {
                  expected:
                    'The response shows at least one PowerShell command line that contains -EncodedCommand.',
                },
              },
            ],
          },
          criteria: [
            'The response shows at least one PowerShell command line that contains -EncodedCommand',
          ],
        });
      }
    );
  }
);
