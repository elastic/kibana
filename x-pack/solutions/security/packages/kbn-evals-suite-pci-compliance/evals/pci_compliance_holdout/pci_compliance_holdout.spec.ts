/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  PCI_HOLDOUT_INDICES,
  cleanupPciHoldoutData,
  seedPciHoldoutData,
} from '../../src/data_generators/pci_data_holdout';

/**
 * HOLDOUT evaluation spec.
 *
 * Mirrors the structure of `pci_compliance.spec.ts` but uses the divergent
 * holdout fixtures (`pci_data_holdout.ts`). Co-runs with the iteration suite
 * under the same Scout boot — see `runs/<label>/results.json` for the
 * combined Elasticsearch capture. Separate scoring is done downstream by
 * partitioning hits via `example.dataset.name` (holdout scenarios prefix with
 * `pci-holdout:`).
 *
 * Criterion design
 * ----------------
 *   - Identical TOOL_NAMES variant-aware helper as the iteration spec, so
 *     hand-written vs autonomous comparisons remain fair on the holdout too.
 *   - Capability-based phrasing wherever practical — e.g. "Identified the
 *     user with the largest failed-login burst" rather than "Mentioned the
 *     user `pcompton`". This makes the rubric language fixture-independent
 *     (a future holdout refresh changes the fixtures but not the spec).
 *   - Counter-cases included: scenario 1 expects the agent to NOT report a
 *     violation. Skills that learnt "failed-login cluster → RED" from the
 *     iteration set will produce a false positive here.
 */

const IS_AUTONOMOUS = (process.env.EVAL_PCI_VARIANT ?? 'handwritten') === 'autonomous';

const TOOL_NAMES = IS_AUTONOMOUS
  ? {
      scopeDiscovery: 'pci_autonomous_scope_discovery',
      fieldMapper: 'pci_autonomous_field_mapper',
      checkCallFor: (requirement: string) =>
        `Used the dedicated PCI compliance CHECK tool (\`pci_autonomous_compliance_check\`) for requirement ${requirement}, rather than improvising raw ES|QL.`,
      reportCall:
        'Used the dedicated PCI scorecard / report tool (`pci_autonomous_scorecard_report`) rather than running a single requirement check.',
    }
  : {
      scopeDiscovery: 'pci_scope_discovery',
      fieldMapper: 'pci_field_mapper',
      checkCallFor: (requirement: string) =>
        `Used the dedicated PCI compliance CHECK tool (\`pci_compliance\` in check mode) for requirement ${requirement}, rather than improvising raw ES|QL.`,
      reportCall:
        'Used the dedicated PCI compliance REPORT tool (`pci_compliance` in report mode), rather than running a single requirement check.',
    };

const ALL_HOLDOUT_INDICES = `${PCI_HOLDOUT_INDICES.identity},${PCI_HOLDOUT_INDICES.flows},${PCI_HOLDOUT_INDICES.pkginfo},${PCI_HOLDOUT_INDICES.edr}`;

evaluate.describe(
  'PCI DSS v4.0.1 Compliance — HOLDOUT',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ internalEsClient, chatClient, log }) => {
      await seedPciHoldoutData({ esClient: internalEsClient, log });

      try {
        await chatClient.converse({ message: 'hello' });
      } catch (e) {
        log.warning(`Warmup failed: ${e}`);
      }
    });

    evaluate.afterAll(async ({ internalEsClient, log }) => {
      await cleanupPciHoldoutData({ esClient: internalEsClient, log });
    });

    // -------------------------------------------------------------------------
    // Holdout 1 — BELOW-threshold failed logins (counter-case).
    // Expected: agent does NOT report a PCI 8.3.4 violation. The 8 failures
    // are below the threshold of 10. A skill that learnt "failed-login cluster
    // → RED" from the iteration set will overfire here.
    // -------------------------------------------------------------------------
    evaluate('holdout: below-threshold failed logins — no violation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'pci-holdout: below-threshold brute force',
          description:
            'Counter-case for PCI 8.3.4. Single user has 8 failed logins (below the PCI v4.0.1 ' +
            'lockout threshold of 10). The correct verdict is GREEN / no-violation. ' +
            'Skills that flag any failed-login cluster will produce a false positive.',
          examples: [
            {
              input: {
                question: `Check PCI DSS requirement 8.3.4 against ${PCI_HOLDOUT_INDICES.identity} for the last 4 hours.`,
              },
              output: {
                criteria: [
                  TOOL_NAMES.checkCallFor('8.3.4 (or requirement 8)'),
                  'Did NOT report a brute-force / 8.3.4 violation — the failed-login count from any single user is below the PCI v4.0.1 lockout threshold of 10.',
                  'If a finding is surfaced at all, it is GREEN, AMBER, or NOT_ASSESSABLE — not RED.',
                  'Did not fabricate or inflate evidence — the count cited matches the actual data (no claims of 10+ failures from a single user).',
                ],
              },
            },
          ],
        },
      });
    });

    // -------------------------------------------------------------------------
    // Holdout 2 — Single weak TLS version (sub-version recognition).
    // Expected: TLS 1.1 violation surfaced. No false positives on TLS 1.2/1.3
    // and no fabricated plain HTTP / TLS 1.0 mentions.
    // -------------------------------------------------------------------------
    evaluate('holdout: TLS 1.1 alone — sub-version recognition', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'pci-holdout: TLS 1.1 only',
          description:
            'Validates the agent can identify a SINGLE deprecated TLS sub-version. The dataset ' +
            'contains no plain HTTP and no TLS 1.0 — only the TLS 1.1 connection should be flagged. ' +
            'Tests that the skill has not learnt "TLS violation = multiple weak versions + plain HTTP".',
          examples: [
            {
              input: {
                question: `Check PCI DSS requirement 4.1 against ${PCI_HOLDOUT_INDICES.flows} for the last 4 hours.`,
              },
              output: {
                criteria: [
                  TOOL_NAMES.checkCallFor('4.1 (or requirement 4)'),
                  'Identified the TLS 1.1 connection as a violation of PCI requirement 4.1 (deprecated cryptography).',
                  'Did NOT fabricate a TLS 1.0 finding — there is no TLS 1.0 traffic in the dataset.',
                  'Did NOT fabricate a plain HTTP / no-TLS finding — the dataset has none.',
                  'Did NOT flag the TLS 1.2 or TLS 1.3 connections as violations.',
                ],
              },
            },
          ],
        },
      });
    });

    // -------------------------------------------------------------------------
    // Holdout 3 — Windows + service-account default-account violations (Req 2.2.4).
    // Tests that the skill recognises default-account patterns beyond Unix
    // `admin` / `root`.
    // -------------------------------------------------------------------------
    evaluate('holdout: Windows + service-account default-account detection', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'pci-holdout: default-account variants',
          description:
            'Validates the skill recognises non-Unix default-account anti-patterns: a Windows ' +
            'built-in `Administrator` and a generic service account naming convention. Tests ' +
            'that the skill has not learnt "default-account = admin or root".',
          examples: [
            {
              input: {
                question: `Check PCI DSS requirement 2.2.4 against ${PCI_HOLDOUT_INDICES.identity} for the last 4 hours.`,
              },
              output: {
                criteria: [
                  TOOL_NAMES.checkCallFor('2.2.4 (or requirement 2)'),
                  'Identified the successful login for the Windows built-in `Administrator` account as a default-account violation.',
                  'Identified the successful login for the generic service-account name (e.g. `service_acct_42`) as either a default-account or shared-account anti-pattern — the criterion is that the agent recognises the pattern, not the specific name.',
                  'Did NOT inflate by labelling every successful login as a default-account violation — legitimate human accounts are not flagged.',
                ],
              },
            },
          ],
        },
      });
    });

    // -------------------------------------------------------------------------
    // Holdout 4 — Non-ECS field mapping with completely new field names.
    // Same ECS-mapping capability as the iteration `custom` index, but every
    // source field is renamed.
    // -------------------------------------------------------------------------
    evaluate('holdout: non-ECS field mapping (new vocabulary)', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'pci-holdout: field mapping new vocabulary',
          description:
            'Validates the field-mapper genuinely infers ECS targets from semantics rather than ' +
            'memorising the iteration set\'s `username → user.name` style hard-codes. Source field ' +
            'names: `actor_name`, `client_addr`, `action_status`, `event_verb`, `device_id`, ' +
            '`cve_id`, `risk_rating`, `command`.',
          examples: [
            {
              input: {
                question: `Map the fields in ${PCI_HOLDOUT_INDICES.legacy} to ECS for PCI compliance queries.`,
              },
              output: {
                criteria: [
                  `Called the ${TOOL_NAMES.fieldMapper} tool against ${PCI_HOLDOUT_INDICES.legacy}.`,
                  'Mapped `actor_name` to the ECS `user.name` field (or an equivalent user-identity field).',
                  'Mapped `client_addr` to the ECS `source.ip` field (or `source.address`).',
                  'Mapped `device_id` to the ECS `host.name` field (or `host.id` / `host.hostname`).',
                  'Mapped `cve_id` to the ECS `vulnerability.id` field.',
                  'Mapped `risk_rating` to the ECS `vulnerability.severity` field (or an `event.severity` family equivalent).',
                  'All proposed targets are valid ECS field names (no fabricated paths).',
                ],
              },
            },
          ],
        },
      });
    });

    // -------------------------------------------------------------------------
    // Holdout 5 — Scope discovery on non-`logs-*` indices. Tests that the
    // skill identifies PCI relevance via field caps (event.category, host.*,
    // vulnerability.*, etc.) rather than via index-name pattern matching.
    // -------------------------------------------------------------------------
    evaluate('holdout: scope discovery on non-logs-* indices', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'pci-holdout: scope discovery non-standard naming',
          description:
            'Validates the skill discovers PCI-relevant data when index names do not follow the ' +
            '`logs-*-{category}` convention. The holdout indices use enterprise naming styles ' +
            '(security-audit-*, siem-flows-*, pkginfo-cve-*, edr-processes-*) so the skill must ' +
            'inspect field caps to classify them.',
          examples: [
            {
              input: {
                question: `What PCI-relevant data do I have across ${ALL_HOLDOUT_INDICES}?`,
              },
              output: {
                criteria: [
                  `Called ${TOOL_NAMES.scopeDiscovery} (rather than running raw ES|QL queries to inspect schemas).`,
                  `Reported ${PCI_HOLDOUT_INDICES.identity} as PCI-relevant for an identity / authentication / IAM scope category.`,
                  `Reported ${PCI_HOLDOUT_INDICES.flows} as PCI-relevant for a network / flows scope category.`,
                  `Reported ${PCI_HOLDOUT_INDICES.pkginfo} as PCI-relevant for a vulnerability / patching scope category.`,
                  `Reported ${PCI_HOLDOUT_INDICES.edr} as PCI-relevant for an endpoint / malware / process scope category.`,
                  'Classification was driven by event.category / field caps rather than by the literal index name suffix.',
                ],
              },
            },
          ],
        },
      });
    });

    // -------------------------------------------------------------------------
    // Holdout 6 — Mixed-window scorecard. Tests that the skill honours a
    // requested 4-hour window (not the iteration set's 1-hour default) and
    // produces a multi-requirement scorecard.
    // -------------------------------------------------------------------------
    evaluate('holdout: 4-hour scorecard mixing requirements', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'pci-holdout: 4h scorecard',
          description:
            'Validates the skill produces a multi-requirement scorecard over a 4-hour window, ' +
            'correctly identifying the genuine violations in the holdout (Req 2.2.4 default ' +
            'accounts; Req 4.1 TLS 1.1) while leaving below-threshold or no-data requirements ' +
            'as non-RED.',
          examples: [
            {
              input: {
                question: `Run a full PCI DSS compliance report using indices ${ALL_HOLDOUT_INDICES} for the last 4 hours.`,
              },
              output: {
                criteria: [
                  TOOL_NAMES.reportCall,
                  'Produced a scorecard covering multiple PCI requirements (by id or by name).',
                  'Flagged requirement 2.2.4 (default accounts) as RED / violation based on the Administrator and service-account successful logins.',
                  'Flagged requirement 4.1 (cryptography in transit) as RED / violation based on the TLS 1.1 traffic.',
                  'Did NOT flag requirement 8.3.4 (brute force) as RED — the single-user failed-login burst is below the PCI v4.0.1 threshold of 10.',
                  'Marked requirements with no matching data (e.g. 3 stored cardholder data, 9 physical access, 12 policies) as AMBER, NOT_ASSESSABLE, or similar non-RED status.',
                ],
              },
            },
          ],
        },
      });
    });
  }
);
