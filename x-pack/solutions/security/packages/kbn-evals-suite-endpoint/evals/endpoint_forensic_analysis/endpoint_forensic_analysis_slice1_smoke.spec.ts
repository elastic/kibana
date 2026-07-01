/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';

/**
 * Slice 1 minimum-sufficient trajectory golden: ES|QL generate → execute.
 * discover_telemetry is recommended in SKILL.md but agents often skip straight to ES|QL;
 * requiring it in golden produced stable 0.67 L2 (2/3 coverage) without signal value.
 */
const SLICE1_FORENSIC_TOOL_SEQUENCE = [
  'platform.core.generate_esql',
  'platform.core.execute_esql',
] as const;

evaluate.describe(
  'Endpoint Forensic Analysis — slice 1 smoke',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ chatClient, log }) => {
      try {
        await chatClient.converse({ message: 'hello' });
      } catch (e) {
        log.warning(`Warmup failed: ${e}`);
      }
    });

    evaluate('patient zero happy path', async ({ evaluateForensicDataset }) => {
      await evaluateForensicDataset({
        dataset: {
          name: 'security: endpoint-forensic-analysis-smoke-patient-zero',
          description:
            'Smoke: patient zero question should activate endpoint-forensic-analysis and use ES|QL tools.',
          examples: [
            {
              input: {
                question:
                  'Which host was patient zero for the ransomware outbreak — trace the initial infection vector across all endpoints.',
              },
              output: {
                criteria: [
                  'Attempts forensic reconstruction (host, timestamp, or infection vector) rather than refusing',
                  'Uses or references ES|QL or endpoint telemetry indices (logs-endpoint.events.*)',
                  'Does not recommend autonomous multi-host plan-and-execute orchestration',
                ],
                tool_sequence: [...SLICE1_FORENSIC_TOOL_SEQUENCE],
              },
              metadata: { golden_id: 'ef-001-patient-zero-outbreak', row_type: 'happy' },
            },
          ],
        },
      });
    });

    evaluate('attack timeline happy path', async ({ evaluateForensicDataset }) => {
      await evaluateForensicDataset({
        dataset: {
          name: 'security: endpoint-forensic-analysis-smoke-timeline',
          description: 'Smoke: host-scoped attack timeline should activate forensic skill.',
          examples: [
            {
              input: {
                question:
                  'Give me a timeline of attacker activity on SRV-DC01 starting from the first suspicious event.',
              },
              output: {
                criteria: [
                  'Produces a chronological narrative or ordered event list for the named host',
                  'References endpoint telemetry or ES|QL query approach',
                  'Scoped to SRV-DC01 (not a fleet-wide proactive hunt)',
                ],
                tool_sequence: [...SLICE1_FORENSIC_TOOL_SEQUENCE],
              },
              metadata: { golden_id: 'ef-005-attack-timeline-host', row_type: 'happy' },
            },
          ],
        },
      });
    });

    evaluate('lateral movement happy path', async ({ evaluateForensicDataset }) => {
      await evaluateForensicDataset({
        dataset: {
          name: 'security: endpoint-forensic-analysis-smoke-lateral',
          description: 'Smoke: lateral movement chain between named hosts.',
          examples: [
            {
              input: {
                question:
                  'Trace the lateral movement path from WKSTN-RECV01 to SRV-DC01 — show every hop, credential used, and remote execution method.',
              },
              output: {
                criteria: [
                  'Addresses lateral movement between the named source and destination hosts',
                  'Mentions credentials, remote execution, or network/process evidence',
                  'Cites query approach or data source',
                ],
                tool_sequence: [...SLICE1_FORENSIC_TOOL_SEQUENCE],
              },
              metadata: { golden_id: 'ef-007-lateral-movement-chain', row_type: 'happy' },
            },
          ],
        },
      });
    });

    evaluate('distractor weather', async ({ evaluateForensicDataset }) => {
      await evaluateForensicDataset({
        dataset: {
          name: 'security: endpoint-forensic-analysis-smoke-distractor-weather',
          description: 'Distractor: unrelated question must not load endpoint-forensic-analysis.',
          examples: [
            {
              input: { question: "What's the weather in San Francisco today?" },
              output: {
                criteria: [
                  'Does not perform endpoint forensic reconstruction or patient-zero analysis',
                  'Does not query logs-endpoint.events.* indices for DFIR purposes',
                ],
              },
              metadata: { golden_id: 'ef-distractor-weather', row_type: 'distractor' },
            },
          ],
        },
      });
    });

    evaluate('distractor dashboard list', async ({ evaluateForensicDataset }) => {
      await evaluateForensicDataset({
        dataset: {
          name: 'security: endpoint-forensic-analysis-smoke-distractor-dashboards',
          description: 'Distractor: platform navigation must not load forensic skill.',
          examples: [
            {
              input: { question: 'List all my Kibana dashboards.' },
              output: {
                criteria: [
                  'Answers as a platform/dashboard request, not a DFIR forensic workflow',
                  'Does not invoke endpoint forensic patient-zero or timeline methodology',
                ],
              },
              metadata: { golden_id: 'ef-distractor-dashboards', row_type: 'distractor' },
            },
          ],
        },
      });
    });
  }
);
