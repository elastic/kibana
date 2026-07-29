/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { waitForEndpointPackage } from '../../src/data_generators/endpoint_data';
import { seedForensicTimeline } from '../../src/data_generators/forensic_data';
import { cleanupSeededData } from '../../src/data_generators/cleanup';

const FORENSIC_ESQL_TRAJECTORY = [
  'platform.core.generate_esql',
  'platform.core.execute_esql',
] as const;

evaluate.describe('Endpoint Forensic Analysis — smoke', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
    await waitForEndpointPackage(kbnClient, esClient, log);
    await cleanupSeededData({ esClient, internalEsClient });
    await seedForensicTimeline({ esClient }, log);

    try {
      await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        input: 'hello',
      });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }
  });

  evaluate.afterAll(async ({ esClient, internalEsClient }) => {
    await cleanupSeededData({ esClient, internalEsClient });
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
              tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
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
                'Produces a chronological, timestamp-ordered narrative for SRV-DC01',
                'Surfaces at least two concrete SRV-DC01 attack stages present in the telemetry — e.g. remote WMI/cmd execution, admin-share credential use (net use), Run-key persistence, volume shadow-copy deletion (vssadmin delete shadows), mass file encryption (.locked), or the ransom note (README_RESTORE.txt)',
                'References endpoint telemetry or ES|QL query approach',
                'Scoped to SRV-DC01 (not a fleet-wide proactive hunt)',
              ],
              tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
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
              tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
            },
            metadata: { golden_id: 'ef-007-lateral-movement-chain', row_type: 'happy' },
          },
        ],
      },
    });
  });

  evaluate('persistence happy path', async ({ evaluateForensicDataset }) => {
    await evaluateForensicDataset({
      dataset: {
        name: 'security: endpoint-forensic-analysis-smoke-persistence',
        description: 'Smoke: registry/run-key persistence enumeration on a named host.',
        examples: [
          {
            input: {
              question:
                'Enumerate persistence mechanisms on SRV-DC01 — run keys, scheduled tasks, and startup items from endpoint telemetry.',
            },
            output: {
              criteria: [
                'Addresses persistence on SRV-DC01 (not a fleet-wide hunt)',
                'References registry run keys, scheduled tasks, services, or startup items',
                'Uses or references ES|QL or logs-endpoint.events.* telemetry',
                'Surfaces at least one concrete persistence indicator from telemetry (e.g. Run\\Updater registry key or C:\\ProgramData\\svc.exe run-key path)',
              ],
              tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
            },
            metadata: { golden_id: 'ef-009-persistence-enumeration', row_type: 'happy' },
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

  evaluate('distractor conflicting antivirus', async ({ evaluateForensicDataset }) => {
    await evaluateForensicDataset({
      dataset: {
        name: 'security: endpoint-forensic-analysis-smoke-distractor-antivirus',
        description:
          'Distractor: naming a specific host does not make an antivirus-conflict question ' +
          'forensic — must route to elastic-defend-configuration-troubleshooting instead of ' +
          'activating endpoint-forensic-analysis. Regression guard for the skill-collision ' +
          'reported on eval-host-av (conflicting antivirus scenario).',
        examples: [
          {
            input: {
              question:
                'Can you check if endpoint eval-host-av has any conflicting antivirus software?',
            },
            output: {
              criteria: [
                'Does not perform endpoint forensic reconstruction, patient-zero analysis, or a chronological timeline',
                'Does not treat this as a forensic-reconstruction question just because a specific host is named',
                'Defers to or is consistent with elastic-defend-configuration-troubleshooting for antivirus/security-software conflicts',
              ],
            },
            metadata: { golden_id: 'ef-distractor-antivirus-conflict', row_type: 'distractor' },
          },
        ],
      },
    });
  });
});
