/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ported from Deductive's alert_outcome_benign_classification/create_dataset.py. Strings are verbatim.
const benignCassandra =
  'Benign / self-resolved: a transient event on the shared Cassandra cluster caused a burst of auction-persistence INSERT failures across all cells (00:01-00:12 UTC) that self-recovered; flat p99 latency, no GCL change events. No remediation was needed.';
const benignLoadTest =
  'Benign: a scheduled synthetic load test drove the worker CPU spike; it ended when the test finished. Expected artifact, no action required.';
const actionablePool =
  'Actionable regression: the payments v3.2.1 deploy leaked Postgres connections and exhausted the pool, spiking checkout latency. It was mitigated by rolling back v3.2.1.';
const actionableOom =
  'Actionable regression: productCatalogService pods were OOMKilled after the v4.1 deploy raised the cache size beyond the memory limit, causing checkout 5xx. A config fix was required.';
const reportBenignCassandra =
  'The INSERT failures were fleet-wide and simultaneous with flat p99 latency and no change events, then self-cleared by 00:12 UTC. This is a transient shared-Cassandra event; it is benign / self-resolved and no rollback or remediation is warranted.';
const reportOverEscalateCassandra =
  'Auction persistence is failing. This is a critical data-integrity incident — paging the ads-serving on-call now and recommending an immediate rollback of the most recent deploy.';
const reportEscalatePool =
  'Root cause: the payments v3.2.1 deploy is leaking Postgres connections and exhausting the pool, timing out checkout. Roll back v3.2.1 immediately and page the payments on-call.';
const reportDismissPool =
  'Checkout latency briefly rose but appears to be settling. This looks like transient load; no action needed — will keep monitoring.';
const reportSymptomOnly =
  'Worker CPU exceeded the alert threshold around the alert window. Error rate is nominal. Investigating.';

export interface AlertOutcomeBenignClassificationFixture {
  readonly suite:
    | 'benign-correct'
    | 'false-escalation'
    | 'actionable-correct'
    | 'false-dismissal'
    | 'benign-underreported';
  readonly description: string;
  readonly confirmedOutcome: string;
  readonly investigationReport: string;
  readonly groundTruthBenign: boolean;
  readonly reportClaimsBenign: boolean;
  readonly reportEscalates: boolean;
}

export const alertOutcomeBenignClassificationFixtures: readonly AlertOutcomeBenignClassificationFixture[] =
  [
    {
      suite: 'benign-correct',
      description: 'Real self-resolved Cassandra outcome reported as benign.',
      confirmedOutcome: benignCassandra,
      investigationReport: reportBenignCassandra,
      groundTruthBenign: true,
      reportClaimsBenign: true,
      reportEscalates: false,
    },
    {
      suite: 'false-escalation',
      description: 'Benign outcome over-escalated (paging + rollback).',
      confirmedOutcome: benignCassandra,
      investigationReport: reportOverEscalateCassandra,
      groundTruthBenign: true,
      reportClaimsBenign: false,
      reportEscalates: true,
    },
    {
      suite: 'actionable-correct',
      description: 'Real regression correctly escalated.',
      confirmedOutcome: actionablePool,
      investigationReport: reportEscalatePool,
      groundTruthBenign: false,
      reportClaimsBenign: false,
      reportEscalates: true,
    },
    {
      suite: 'false-dismissal',
      description: 'Real regression wrongly called benign.',
      confirmedOutcome: actionablePool,
      investigationReport: reportDismissPool,
      groundTruthBenign: false,
      reportClaimsBenign: true,
      reportEscalates: false,
    },
    {
      suite: 'false-dismissal',
      description: 'OOM regression wrongly called benign.',
      confirmedOutcome: actionableOom,
      investigationReport: reportDismissPool,
      groundTruthBenign: false,
      reportClaimsBenign: true,
      reportEscalates: false,
    },
    {
      suite: 'benign-underreported',
      description: 'Benign outcome left unclassified (symptom-only report).',
      confirmedOutcome: benignLoadTest,
      investigationReport: reportSymptomOnly,
      groundTruthBenign: true,
      reportClaimsBenign: false,
      reportEscalates: false,
    },
  ];
