/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  PCI_INDICES,
  cleanupPciEvalData,
  seedPciEvalData,
} from '../../src/data_generators/pci_data';

const SKILL_PATH = 'skills/security/pci_compliance/SKILL.md';

evaluate.describe('PCI DSS v4.0.1 Compliance', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ internalEsClient, chatClient, log }) => {
    await seedPciEvalData({ esClient: internalEsClient, log });

    // Warm the connector so the first real example doesn't pay the cold-start latency.
    try {
      await chatClient.converse({ message: 'hello' });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }
  });

  evaluate.afterAll(async ({ internalEsClient, log }) => {
    await cleanupPciEvalData({ esClient: internalEsClient, log });
  });

  evaluate('requirement 8 — brute-force detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: requirement 8 brute force',
        description:
          'Validates the agent detects repeated failed logins for PCI DSS requirement 8 ' +
          '(identify users and authenticate access) and surfaces evidence scoped to the ' +
          'seeded auth index.',
        examples: [
          {
            input: {
              question: `Can you run a PCI DSS requirement 8 compliance check against ${PCI_INDICES.auth} for the last hour and surface any violations with evidence?`,
            },
            output: {
              criteria: [
                `Activated the PCI skill by reading ${SKILL_PATH}`,
                'Called the pci_compliance tool in check mode for requirement 8 (or a subrequirement like 8.3.4).',
                `Passed the index pattern ${PCI_INDICES.auth} (or an equivalent) to the tool — not an arbitrary logs-* default.`,
                'Surfaced the repeated failed logins for user "eval-compromised-user" as a RED / violation finding.',
                'The evidence cited matches the seeded data: failed authentication events from source IP 10.0.0.55.',
              ],
            },
          },
        ],
      },
    });
  });

  evaluate('requirement 4 — weak TLS detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: requirement 4 weak TLS',
        description:
          'Validates the agent surfaces legacy TLS/SSL connections as PCI DSS requirement 4 ' +
          '(protect cardholder data with strong cryptography during transmission) violations.',
        examples: [
          {
            input: {
              question: `Check PCI DSS requirement 4 against ${PCI_INDICES.network} for the last hour. Are there any weak TLS or legacy SSL connections?`,
            },
            output: {
              criteria: [
                `Activated the PCI skill by reading ${SKILL_PATH}`,
                'Called the pci_compliance tool in check mode for requirement 4 (or a subrequirement like 4.2.1).',
                'Identified weak TLS 1.0 and SSLv3 connections from the seeded network data.',
                'Did not report the strong TLS 1.3 traffic as a violation.',
              ],
            },
          },
        ],
      },
    });
  });

  evaluate('scope discovery across PCI-relevant data', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: scope discovery',
        description:
          'Validates the agent inventories which indices contain PCI-relevant telemetry before ' +
          'running checks, so scope is transparent to the QSA.',
        examples: [
          {
            input: {
              question:
                'Which indices in my cluster contain PCI-relevant telemetry? I want to know what you can actually assess before running a compliance report.',
            },
            output: {
              criteria: [
                `Activated the PCI skill by reading ${SKILL_PATH}`,
                'Called pci_scope_discovery (rather than running compliance checks directly).',
                `Reported at least one of the seeded indices (${PCI_INDICES.auth}, ${PCI_INDICES.network}) as PCI-relevant.`,
                'Classified network-style indices under the "network" scope and auth-style indices under "identity".',
              ],
            },
          },
        ],
      },
    });
  });

  evaluate('field mapping for non-ECS custom data', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: field mapping',
        description:
          'Validates the agent maps non-ECS fields (username, src_ip, hostname, result) to ECS ' +
          'equivalents so PCI queries can still cover custom-ingested data.',
        examples: [
          {
            input: {
              question: `The index ${PCI_INDICES.custom} has custom field names rather than ECS. Which ECS fields should each one map to for PCI compliance queries?`,
            },
            output: {
              criteria: [
                `Activated the PCI skill by reading ${SKILL_PATH}`,
                'Called the pci_field_mapper tool against the supplied custom index.',
                'Suggested mapping "username" → "user.name".',
                'Suggested mapping "src_ip" → "source.ip".',
                'Suggested mapping "hostname" → "host.name".',
                'Did not suggest mappings for sensitive fields like card numbers (none are present and none should be fabricated).',
              ],
            },
          },
        ],
      },
    });
  });

  evaluate('posture report across all requirements', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: posture report',
        description:
          'Validates the agent produces a PCI DSS v4.0.1 posture report using the pci_compliance ' +
          'tool in report mode and rolls up RED/AMBER/GREEN with confidence.',
        examples: [
          {
            input: {
              question: `Generate a PCI DSS compliance report for all 12 requirements scoped to ${PCI_INDICES.auth},${PCI_INDICES.network} for the last hour.`,
            },
            output: {
              criteria: [
                `Activated the PCI skill by reading ${SKILL_PATH}`,
                'Called the pci_compliance tool in report mode (not check mode).',
                'Produced a scorecard covering requirements 1–12 (by id or by name).',
                'Assigned RED or AMBER to requirement 8 given the seeded brute-force data.',
                'Assigned RED or AMBER to requirement 4 given the seeded weak TLS data.',
                'Reported an overall confidence rollup (HIGH / MEDIUM / LOW / NOT_ASSESSABLE) rather than a single score alone.',
              ],
            },
          },
        ],
      },
    });
  });
});
