/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../src/evaluate';
import { dedJobIds, securityAuthJobIds, lmdJobIds, padJobIds } from '../src/ml_helpers';

evaluate.describe(
  'SIEM ML Jobs Skill - Anomalous Behavior without ML Jobs',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('entity analytics anomalous behavior questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: anomalous behavior without data',
          description: 'Questions to test the SIEM ML Jobs skill - anomalous behavior without data',
          examples: [
            {
              input: {
                question: 'Which service accounts have unusual access patterns?',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${[
                    ...securityAuthJobIds,
                    'v3_windows_anomalous_service',
                  ].join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show users logged in from multiple locations',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Are there connections suggesting lateral movement?',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${lmdJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show accounts performing unusual administrative actions',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which users uploaded data to external domains?',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show unusual access attempts to privileged accounts',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${padJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me users with suspicious login patterns',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${securityAuthJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me entities with anomalous behavior in the last 24 hours',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: ${dedJobIds.join(', ')}`,
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show users who downloaded unusually large data',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs and list the job ids',
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which accounts have downloaded more than 1GB this week?',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                ],
                toolCalls: [{ id: 'find.security.ml.jobs' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Is anyone accessing sensitive data from new locations?',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Are there any unusual access patterns after hours?',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 1 job id from the list: auth_rare_hour_for_a_user_ea`,
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  }
);
