/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP-shaped alert-queue token-cost lab (security-team#21037).
 *
 * Seeds 4 threshold failed-logon alerts from one rule and asks 15 queue-style
 * questions. Forced skill binding (skillIds) compares arms without relying on
 * router selection. CODE evaluators count triage-tool calls that drive the
 * token cost the issue reported.
 *
 * The original AESOP dataset was not published; this is the documented fallback.
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
const QUEUE_ALERT_ID_PREFIX = 'queue-token-cost-eval-alert-';
const RULE_NAME = 'Threshold Failed Logon Burst';
const RULE_ID = 'queue-token-cost-failed-logon';
const USER = 'jsmith';
const HOST = 'win-dc01';

const buildQueueAlertDoc = (index: number) => {
  const timestamp = new Date(Date.now() - (index + 1) * 15 * 60 * 1000).toISOString();
  return {
    '@timestamp': timestamp,
    message: `Threshold alert: ${RULE_NAME} for user ${USER} on ${HOST}`,
    'host.name': HOST,
    'user.name': USER,
    'source.ip': `10.0.0.${10 + index}`,
    'event.category': ['authentication'],
    'event.action': 'user_login',
    'event.outcome': 'failure',
    'kibana.alert.uuid': `${QUEUE_ALERT_ID_PREFIX}${index}`,
    'kibana.alert.original_time': timestamp,
    'kibana.alert.severity': index === 0 ? 'high' : 'medium',
    'kibana.alert.risk_score': index === 0 ? 73 : 47,
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.reason': `${RULE_NAME} triggered for ${USER} on ${HOST}`,
    'kibana.alert.rule.name': RULE_NAME,
    'kibana.alert.rule.rule_id': RULE_ID,
    'kibana.alert.rule.category': 'Threshold',
    'kibana.alert.rule.description':
      'Detects a burst of failed logon attempts for a single user on a Windows host.',
    'threat.tactic.name': 'Credential Access',
    'threat.technique.name': 'Brute Force',
  };
};

/** 15 queue prompts, AESOP-shaped: inventory / count / prioritize over a thin alert queue. */
const QUEUE_PROMPTS: Array<{ id: string; question: string; expected: string }> = [
  {
    id: 'count-open',
    question: 'How many open alerts are there?',
    expected: 'States there are 4 open alerts (or the current open count from the seeded queue).',
  },
  {
    id: 'list-all',
    question: 'List the open alerts.',
    expected: 'Lists the open alerts, including the failed-logon threshold alerts.',
  },
  {
    id: 'list-high',
    question: 'List the high severity alerts.',
    expected: 'Lists high severity alerts from the queue.',
  },
  {
    id: 'count-high',
    question: 'How many high severity alerts are open?',
    expected: 'Gives a count of high severity open alerts.',
  },
  {
    id: 'list-by-rule',
    question: `List alerts from the rule "${RULE_NAME}".`,
    expected: `Lists alerts whose rule name is ${RULE_NAME}.`,
  },
  {
    id: 'count-by-rule',
    question: `How many alerts did "${RULE_NAME}" generate?`,
    expected: 'Gives a count of alerts for that rule.',
  },
  {
    id: 'list-by-user',
    question: `Which alerts involve user ${USER}?`,
    expected: `Lists alerts that involve ${USER}.`,
  },
  {
    id: 'list-by-host',
    question: `Which alerts involve host ${HOST}?`,
    expected: `Lists alerts that involve ${HOST}.`,
  },
  {
    id: 'prioritize',
    question: 'Which open alerts should I look at first?',
    expected: 'Prioritizes open alerts, putting higher severity ahead of lower severity.',
  },
  {
    id: 'summarize-queue',
    question: 'Summarize the current alert queue.',
    expected: 'Summarizes the open alerts without inventing alerts that are not in the queue.',
  },
  {
    id: 'failed-logon-theme',
    question: 'Are there any failed logon or brute-force related alerts?',
    expected: 'Identifies the failed-logon threshold alerts.',
  },
  {
    id: 'medium-count',
    question: 'How many medium severity alerts are there?',
    expected: 'Gives a count of medium severity alerts.',
  },
  {
    id: 'unique-hosts',
    question: 'Which hosts appear in the open alerts?',
    expected: `Names ${HOST} among the hosts in the open alerts.`,
  },
  {
    id: 'unique-users',
    question: 'Which users appear in the open alerts?',
    expected: `Names ${USER} among the users in the open alerts.`,
  },
  {
    id: 'last-hour',
    question: 'List alerts from the last 24 hours.',
    expected: 'Lists recent alerts from the seeded queue.',
  },
];

/** Queue questions worded to tempt triage tools (related alerts, Security Labs, entity risk). */
const TEMPTING_PROMPTS: Array<{ id: string; question: string; expected: string }> = [
  {
    id: 'worth-escalating',
    question: 'Is anything in the open alert queue worth escalating?',
    expected: 'Judges the open alerts from the queue and names the highest severity one.',
  },
  {
    id: 'related-to-each-other',
    question: 'Are the open alerts related to each other?',
    expected: `Says the open alerts come from ${RULE_NAME} for ${USER} on ${HOST}.`,
  },
  {
    id: 'riskiest-user',
    question: 'Which user in the open alerts looks the riskiest?',
    expected: `Names ${USER} as the user in the open alerts.`,
  },
  {
    id: 'what-to-do',
    question: 'What should I do about the open alerts?',
    expected: 'Gives next steps based on the open alerts in the queue.',
  },
  {
    id: 'is-host-at-risk',
    question: `Is ${HOST} at risk based on the open alerts?`,
    expected: `Assesses ${HOST} using the open alerts that involve it.`,
  },
  {
    id: 'technique-context',
    question: 'What attack technique do the open alerts point to?',
    expected: 'Names brute force or credential access from the open alerts.',
  },
  {
    id: 'rundown-user',
    question: `Give me a quick rundown of the queue and what is going on with ${USER}.`,
    expected: `Summarizes the open alerts and the activity for ${USER}.`,
  },
  {
    id: 'same-source',
    question: 'Do the open alerts share a source IP or other indicator?',
    expected: 'Reports the source IPs of the open alerts without inventing indicators.',
  },
];

type EvaluateAlertQueue = ReturnType<typeof createEvaluateConverse>;

const evaluate = base.extend<{ evaluateAlertQueue: EvaluateAlertQueue }, {}>({
  evaluateAlertQueue: [
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
  'Security Alert Triage — alert queue token cost (AESOP-shaped)',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate.beforeAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      log.info(`Indexing 4 queue token-cost alerts into ${ALERTS_INDEX}`);

      const response = await esClient.bulk({
        refresh: 'wait_for',
        operations: Array.from({ length: 4 }, (_, index) => [
          { index: { _index: ALERTS_INDEX, _id: `${QUEUE_ALERT_ID_PREFIX}${index}` } },
          buildQueueAlertDoc(index),
        ]).flat(),
      });

      if (response.errors) {
        const failed = response.items.filter((item) => item.index?.error);
        throw new Error(
          `Failed to set up queue token-cost alerts: ${JSON.stringify(
            failed.map((f) => f.index?.error)
          )}`
        );
      }
    });

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      log.info('Deleting queue token-cost alerts');
      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { prefix: { 'kibana.alert.uuid': QUEUE_ALERT_ID_PREFIX } },
      });
    });

    // Forced alert-analysis binding — measures the shipped skill on queue questions.
    evaluate('Alert queue — skill bound (alert-analysis)', async ({ evaluateAlertQueue }) => {
      await evaluateAlertQueue({
        dataset: {
          name: 'agent builder: security-alert-queue-token-cost-skill',
          description:
            'AESOP-shaped queue questions with configuration_overrides.skill_ids=[alert-analysis]. ' +
            'Expects factual answers and near-zero triage-tool calls (related-alerts, labs, get_entity).',
          examples: QUEUE_PROMPTS.map(({ id, question, expected }) => ({
            id,
            input: { question },
            output: { expected },
            metadata: { skillIds: ['alert-analysis'] },
          })),
        },
        criteria: [
          'The response answers the alert-queue question using the alerts that exist',
          'The response does not invent alerts that are not in the queue',
        ],
      });
    });

    // Queue questions that invite triage; measures whether the skill keeps the model on security.alerts.
    evaluate('Alert queue — tempting questions, skill bound', async ({ evaluateAlertQueue }) => {
      await evaluateAlertQueue({
        dataset: {
          name: 'agent builder: security-alert-queue-tempting-skill',
          description:
            'Queue questions worded to invite related-alert, Security Labs, or entity-risk calls, ' +
            'with configuration_overrides.skill_ids=[alert-analysis].',
          examples: TEMPTING_PROMPTS.map(({ id, question, expected }) => ({
            id,
            input: { question },
            output: { expected },
            metadata: { skillIds: ['alert-analysis'] },
          })),
        },
        criteria: [
          'The response answers the alert-queue question using the alerts that exist',
          'The response does not invent alerts, hosts, users, or indicators that are not in the queue',
        ],
      });
    });

    // No-skill arm — skill_ids=[] with built-in skills off, so alert-analysis cannot load (AESOP finding 7).
    // security.alerts is granted directly because it is otherwise only reachable through the skill.
    evaluate('Alert queue — no skill bound', async ({ evaluateAlertQueue }) => {
      await evaluateAlertQueue({
        dataset: {
          name: 'agent builder: security-alert-queue-token-cost-no-skill',
          description:
            'Same queue questions with no skills and only the security.alerts tool. ' +
            'Baseline for token cost and factuality vs the skill-bound arm.',
          examples: QUEUE_PROMPTS.map(({ id, question, expected }) => ({
            id: `${id}-no-skill`,
            input: { question },
            output: { expected },
            metadata: { skillIds: [], toolIds: ['security.alerts'] },
          })),
        },
        criteria: [
          'The response answers the alert-queue question using the alerts that exist',
          'The response does not invent alerts that are not in the queue',
        ],
      });
    });
  }
);
