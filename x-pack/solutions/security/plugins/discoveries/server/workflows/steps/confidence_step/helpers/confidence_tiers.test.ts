/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '../../../../../common/step_types/shared_schemas';
import { computeDeterministicFactors, toBand } from './compute_deterministic_factors';
import { parseAnonymizedAlertsCsv } from './parse_anonymized_alerts_csv';

/**
 * Offline evaluation of the deterministic confidence seed across three labeled
 * scenarios (clear-malicious / ambiguous / likely-FP). These are the "Explore
 * Done" tiers from the epic: the deterministic prior must separate high >
 * medium > low. Fully deterministic — no LLM, connector, ES, or feature flags.
 *
 * Each scenario is authored as anonymized-alert CSV documents (exactly what the
 * step parses at runtime) so this doubles as a parse + compute integration.
 */

type FieldValue = string | string[];

/** Build one anonymized-alert `page_content` CSV document. */
const alertDoc = (id: string, fields: Record<string, FieldValue>) => {
  const lines = [
    `_id,${id}`,
    ...Object.entries(fields).map(([k, v]) => `${k},${Array.isArray(v) ? v.join(',') : v}`),
  ];
  return { metadata: {}, page_content: lines.join('\n') };
};

// --- HIGH: broad, multi-tactic chain on one host+user, no benign signals ---
const HIGH_ALERT_IDS = ['h1', 'h2', 'h3', 'h4', 'h5'];
const highAlerts = [
  alertDoc('h1', {
    'event.category': ['process'],
    'event.dataset': 'endpoint.events.process',
    'threat.tactic.id': 'TA0001',
    'threat.technique.id': 'T1566',
    'host.name': 'host-A',
    'user.name': 'user-A',
    'kibana.alert.severity': 'critical',
    'kibana.alert.workflow_status': 'open',
  }),
  alertDoc('h2', {
    'event.category': ['process'],
    'event.dataset': 'endpoint.events.process',
    'threat.tactic.id': 'TA0002',
    'threat.technique.id': 'T1059',
    'host.name': 'host-A',
    'user.name': 'user-A',
    'kibana.alert.severity': 'critical',
    'kibana.alert.workflow_status': 'open',
  }),
  alertDoc('h3', {
    'event.category': ['authentication'],
    'event.dataset': 'endpoint.events.authentication',
    'threat.tactic.id': 'TA0006',
    'threat.technique.id': 'T1003',
    'host.name': 'host-A',
    'user.name': 'user-A',
    'kibana.alert.severity': 'high',
    'kibana.alert.workflow_status': 'open',
  }),
  alertDoc('h4', {
    'event.category': ['network'],
    'event.dataset': 'endpoint.events.network',
    'threat.tactic.id': 'TA0011',
    'threat.technique.id': 'T1071',
    'host.name': 'host-A',
    'user.name': 'user-A',
    'kibana.alert.severity': 'critical',
    'kibana.alert.workflow_status': 'open',
  }),
  alertDoc('h5', {
    'event.category': ['file'],
    'event.dataset': 'endpoint.events.file',
    'threat.tactic.id': 'TA0040',
    'threat.technique.id': 'T1486',
    'host.name': 'host-A',
    'user.name': 'user-A',
    'kibana.alert.severity': 'critical',
    'kibana.alert.workflow_status': 'open',
  }),
];

// --- MEDIUM: dual-use, one host, few tactics, one benign signal ---
const MEDIUM_ALERT_IDS = ['m1', 'm2', 'm3'];
const mediumAlerts = [
  alertDoc('m1', {
    'event.category': ['process'],
    'event.dataset': 'endpoint.events.process',
    'threat.tactic.id': 'TA0002',
    'threat.technique.id': 'T1059',
    'host.name': 'host-B',
    'user.name': 'user-B',
    'kibana.alert.severity': 'high',
    'kibana.alert.workflow_status': 'open',
  }),
  alertDoc('m2', {
    'event.category': ['network'],
    'event.dataset': 'endpoint.events.network',
    'threat.tactic.id': 'TA0005',
    'threat.technique.id': 'T1218',
    'host.name': 'host-B',
    'user.name': 'user-B',
    'kibana.alert.severity': 'high',
    'kibana.alert.workflow_status': 'open',
  }),
  alertDoc('m3', {
    'event.category': ['process'],
    'event.dataset': 'endpoint.events.process',
    'threat.tactic.id': 'TA0002',
    'threat.technique.id': 'T1059',
    'host.name': 'host-B',
    'user.name': 'user-B',
    // the single benign signal: one low-severity alert
    'kibana.alert.severity': 'low',
    'kibana.alert.workflow_status': 'open',
  }),
];

// --- LOW: thin, single-tactic, different entities, maximal counter-evidence ---
const LOW_ALERT_IDS = ['l1', 'l2'];
const lowAlerts = [
  alertDoc('l1', {
    'event.category': ['process'],
    'event.dataset': 'endpoint.events.process',
    'threat.tactic.id': 'TA0002',
    'threat.technique.id': 'T1059',
    'host.name': 'host-C1',
    'user.name': 'user-C1',
    'process.code_signature.trusted': 'true',
    'kibana.alert.severity': 'low',
    'kibana.alert.workflow_status': 'closed',
  }),
  alertDoc('l2', {
    'event.category': ['process'],
    'event.dataset': 'endpoint.events.process',
    'threat.tactic.id': 'TA0002',
    'threat.technique.id': 'T1059',
    'host.name': 'host-C2',
    'user.name': 'user-C2',
    'process.code_signature.trusted': 'true',
    'kibana.alert.severity': 'low',
    'kibana.alert.workflow_status': 'closed',
  }),
];

const discovery = (alertIds: string[]): AttackDiscovery => ({
  alert_ids: alertIds,
  details_markdown: 'details',
  summary_markdown: 'summary',
  title: 'scenario',
});

const scoreTier = (alertIds: string[], alerts: ReturnType<typeof alertDoc>[]) =>
  computeDeterministicFactors({
    discovery: discovery(alertIds),
    rowsById: parseAnonymizedAlertsCsv(alerts),
  });

describe('confidence tiers — deterministic seed separation', () => {
  const high = scoreTier(HIGH_ALERT_IDS, highAlerts);
  const medium = scoreTier(MEDIUM_ALERT_IDS, mediumAlerts);
  const low = scoreTier(LOW_ALERT_IDS, lowAlerts);

  it('maps each scenario to its expected band', () => {
    expect(toBand(high.baseScore)).toBe('high');
    expect(toBand(medium.baseScore)).toBe('medium');
    expect(toBand(low.baseScore)).toBe('low');
  });

  it('produces a strict monotonic ordering high > medium > low', () => {
    expect(high.baseScore).toBeGreaterThan(medium.baseScore);
    expect(medium.baseScore).toBeGreaterThan(low.baseScore);
  });

  it('lands each score within its tier window', () => {
    expect(high.baseScore).toBeGreaterThanOrEqual(0.7);
    expect(medium.baseScore).toBeGreaterThanOrEqual(0.4);
    expect(medium.baseScore).toBeLessThan(0.7);
    expect(low.baseScore).toBeLessThan(0.4);
  });

  it('drives the factors as designed across tiers', () => {
    const weight = (r: typeof high, name: string) =>
      r.factors.find((f) => f.name === name)?.weight ?? 0;

    // breadth + mitre strongest in HIGH, weakest in LOW
    expect(weight(high, 'evidence_breadth')).toBeGreaterThan(weight(low, 'evidence_breadth'));
    expect(weight(high, 'mitre_completeness')).toBeGreaterThan(weight(low, 'mitre_completeness'));

    // counter-evidence: none in HIGH, maximal in LOW (negative weight)
    expect(high.counterStrength).toBe(0);
    expect(low.counterStrength).toBeGreaterThan(0.9);
    expect(weight(low, 'counter_evidence')).toBeLessThan(0);
  });
});
