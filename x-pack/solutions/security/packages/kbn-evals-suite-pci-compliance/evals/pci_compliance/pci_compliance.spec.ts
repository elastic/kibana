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

const ALL_ECS_INDICES = `${PCI_INDICES.auth},${PCI_INDICES.network},${PCI_INDICES.vuln},${PCI_INDICES.endpoint}`;

evaluate.describe('PCI DSS v4.0.1 Compliance', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ internalEsClient, chatClient, log }) => {
    await seedPciEvalData({ esClient: internalEsClient, log });

    try {
      await chatClient.converse({ message: 'hello' });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }
  });

  evaluate.afterAll(async ({ internalEsClient, log }) => {
    await cleanupPciEvalData({ esClient: internalEsClient, log });
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: Full Compliance Report
  // ---------------------------------------------------------------------------
  evaluate('full compliance report across all requirements', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: full report',
        description:
          'Validates the agent produces a full PCI DSS v4.0.1 posture report covering all 12 ' +
          'requirements. Expected flow: scope_discovery → compliance_check (all) → compliance_report. ' +
          'Req 4.1 and 8.3.4 should be RED, req 2.2.4 RED (default accounts), ' +
          'non-assessable requirements (3, 9, 12) should be AMBER/NOT_ASSESSABLE.',
        examples: [
          {
            input: {
              question: `Run a full PCI DSS compliance report using indices ${ALL_ECS_INDICES} for the last hour.`,
            },
            output: {
              criteria: [
                'Called the pci_compliance tool in report mode (not just a single check).',
                'Produced a scorecard covering requirements 1–12 (by id or by name).',
                'Assigned RED or violation status to requirement 8 (or 8.3.4) due to the brute-force data for user "jdoe".',
                'Assigned RED or violation status to requirement 4 (or 4.1) due to weak TLS 1.0, TLS 1.1, and plain HTTP traffic.',
                'Flagged requirement 2.2.4 as RED or violation due to "admin" and "root" successful logins.',
                'Marked requirements with no matching data (e.g. 3 — stored data, 9 — physical access, 12 — policies) as AMBER, NOT_ASSESSABLE, or similar non-GREEN status.',
                'Reported an overall confidence rollup (HIGH / MEDIUM / LOW / NOT_ASSESSABLE) rather than a single score alone.',
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Single Requirement — Brute Force (Req 8.3.4)
  // ---------------------------------------------------------------------------
  evaluate('requirement 8.3.4 — brute-force detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: requirement 8.3.4 brute force',
        description:
          'Validates the agent detects repeated failed logins exceeding the threshold of 10 ' +
          'for PCI DSS requirement 8.3.4. Expected: RED status, HIGH confidence. ' +
          'Evidence: jdoe with 12 failed login attempts from 192.168.1.100.',
        examples: [
          {
            input: {
              question: `Check PCI DSS requirement 8.3.4 against ${PCI_INDICES.auth} for the last hour and surface any violations with evidence.`,
            },
            output: {
              criteria: [
                'Called the pci_compliance tool in check mode for requirement 8.3.4 (or requirement 8).',
                `Passed the index pattern ${PCI_INDICES.auth} (or an equivalent) to the tool.`,
                'Surfaced the repeated failed logins for user "jdoe" as a RED / violation finding.',
                'The evidence shows at least 12 (or more than 10) failed authentication attempts for user "jdoe".',
                'The source IP 192.168.1.100 is mentioned in the brute-force evidence.',
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Single Requirement — Weak TLS (Req 4.1)
  // ---------------------------------------------------------------------------
  evaluate('requirement 4.1 — weak TLS detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: requirement 4.1 weak TLS',
        description:
          'Validates the agent surfaces legacy TLS/SSL and unencrypted HTTP connections as ' +
          'PCI DSS requirement 4.1 violations. Expected: RED. ' +
          'Violations: 203.0.113.51 (TLS 1.0), 203.0.113.52 (TLS 1.1), 198.51.100.10 (HTTP/no TLS).',
        examples: [
          {
            input: {
              question: `Check PCI requirement 4.1 against ${PCI_INDICES.network} for the last hour. Are there any weak TLS or unencrypted connections?`,
            },
            output: {
              criteria: [
                'Called the pci_compliance tool in check mode for requirement 4.1 (or requirement 4).',
                'Identified TLS 1.0 connections (destination 203.0.113.51) as a violation.',
                'Identified TLS 1.1 connections (destination 203.0.113.52) as a violation.',
                'Identified plain HTTP traffic (destination 198.51.100.10, no TLS) as a violation.',
                'Did not report the strong TLS 1.2 and TLS 1.3 traffic as violations.',
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: Single Requirement — Default Accounts (Req 2.2.4)
  // ---------------------------------------------------------------------------
  evaluate('requirement 2.2.4 — default account detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: requirement 2.2.4 default accounts',
        description:
          'Validates the agent detects successful logins from default/well-known accounts ' +
          '(admin, root) as a PCI DSS requirement 2.2.4 violation. Expected: RED.',
        examples: [
          {
            input: {
              question: `Check PCI DSS requirement 2.2.4 against ${PCI_INDICES.auth} for the last hour.`,
            },
            output: {
              criteria: [
                'Called the pci_compliance tool in check mode for requirement 2.2.4 (or requirement 2).',
                'Identified successful authentication events for "admin" as a violation — default accounts should not be in active use.',
                'Identified successful authentication events for "root" as a violation — default accounts should not be in active use.',
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Scope Discovery
  // ---------------------------------------------------------------------------
  evaluate('scope discovery across PCI-relevant data', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: scope discovery',
        description:
          'Validates the agent inventories which indices contain PCI-relevant telemetry before ' +
          'running checks. Expected: 4 ECS indices discovered with correct categories — ' +
          'auth → identity, network → network, vuln → endpoint, endpoint → endpoint.',
        examples: [
          {
            input: {
              question: `What PCI-relevant data do I have in ${PCI_INDICES.auth},${PCI_INDICES.network},${PCI_INDICES.vuln},${PCI_INDICES.endpoint}?`,
            },
            output: {
              criteria: [
                'Called pci_scope_discovery (rather than running compliance checks directly).',
                `Reported ${PCI_INDICES.auth} as PCI-relevant, classified under "identity" or auth category.`,
                `Reported ${PCI_INDICES.network} as PCI-relevant, classified under "network" category.`,
                `Reported ${PCI_INDICES.vuln} as PCI-relevant. The tool classified it under one or more of: "vulnerability", "endpoint", "identity", "network" (the exact category names from pci_scope_discovery).`,
                `Reported ${PCI_INDICES.endpoint} as PCI-relevant, classified under "endpoint" or malware category.`,
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: Field Mapper — Non-ECS Data
  // ---------------------------------------------------------------------------
  evaluate('field mapping for non-ECS custom data', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: field mapping',
        description:
          'Validates the agent maps non-ECS fields in the custom legacy index to their ECS ' +
          'equivalents. Expected mappings: username → user.name, src_ip → source.ip, ' +
          'auth_result → event.outcome, operation → event.action, hostname → host.name, ' +
          'cve → vulnerability.id, severity → vulnerability.severity, program → process.name.',
        examples: [
          {
            input: {
              question: `Map the fields in ${PCI_INDICES.custom} to ECS for PCI compliance queries.`,
            },
            output: {
              criteria: [
                'Called the pci_field_mapper tool against the supplied custom index.',
                'Suggested mapping "username" → "user.name".',
                'Suggested mapping "src_ip" → "source.ip".',
                'Suggested mapping "hostname" → "host.name".',
                'Suggested mapping "cve" → "vulnerability.id".',
                'Suggested mapping "severity" to the ECS field "vulnerability.severity".',
                'All suggested mappings target valid ECS field names (e.g., user.name, source.ip, host.name, vulnerability.id, vulnerability.severity, event.outcome, event.action, process.name).',
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: Scoped to Specific Index (auth-only)
  // ---------------------------------------------------------------------------
  evaluate('scoped check using only the auth index', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: scoped to auth index',
        description:
          'Validates that when scoped to only the auth index, auth-related requirements ' +
          '(8, 8.3.4, 8.3.9, 2.2.4) produce real results while network/vuln/malware ' +
          'requirements are AMBER or NOT_ASSESSABLE.',
        examples: [
          {
            input: {
              question: `Check PCI compliance using only ${PCI_INDICES.auth} for the last hour.`,
            },
            output: {
              criteria: [
                `Scoped the check to ${PCI_INDICES.auth} (not logs-* or a broader pattern).`,
                'Produced real findings for authentication-related requirements (requirement 8 and/or 2.2.4).',
                'Marked network-related requirements (e.g. 1, 4) as AMBER, NOT_ASSESSABLE, or similar since network data is not in the auth index.',
                'Marked vulnerability/malware requirements (e.g. 5, 6, 11) as AMBER, NOT_ASSESSABLE, or similar since that data is not in the auth index.',
              ],
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: No Matching Data (Req 9 — Physical Access)
  // ---------------------------------------------------------------------------
  evaluate('requirement 9 — no matching physical access data', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'pci-compliance: no matching data',
        description:
          'Validates the agent handles missing data gracefully. Requirement 9 (physical access) ' +
          'has no matching events in any test index. Expected: AMBER or NOT_ASSESSABLE.',
        examples: [
          {
            input: {
              question: `Check PCI requirement 9 against ${ALL_ECS_INDICES} for the last hour.`,
            },
            output: {
              criteria: [
                'Called the pci_compliance tool in check mode for requirement 9.',
                'Returned AMBER, NOT_ASSESSABLE, or an equivalent non-GREEN / non-RED status.',
                'Explained that no physical access or badge events were found in the evaluated indices.',
                'Did not fabricate violations or evidence — the finding reflects the actual absence of data.',
              ],
            },
          },
        ],
      },
    });
  });
});
