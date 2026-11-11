/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ported from Deductive's alert_outcome_rca_accuracy/create_dataset.py. Strings are verbatim.
const cassandraCause =
  'The alert resolved because a transient event on the shared `dd-cassandra-production-ads-serving` Cassandra cluster ended on its own — no deploy, rollback, DV change, or manual intervention was involved. A transient cluster-level event (most likely dropped messages or a GC pause on one or more nodes) caused a burst of `auction_winner_by_id` INSERT failures across all 4 US cells simultaneously from ~00:01 to ~00:12 UTC; the cluster self-recovered. Cassandra p99 INSERT latency was stable (~9.3-9.8ms) throughout and GCL showed zero change events, ruling out a deploy or overload.';
const poolCause =
  "A connection-pool leak introduced by the payments v3.2.1 deploy exhausted the Postgres connection pool, causing checkout p99 latency to spike and a burst of 'connection timeout' errors.";
const oomCause =
  'productCatalogService pods OOMKilled after the v4.1 deploy raised the in-memory cache size beyond the container memory limit, causing checkout 5xx.';
const cassandraReportNailed =
  'Root cause: a transient event on the shared `dd-cassandra-production-ads-serving` cluster caused simultaneous `auction_winner_by_id` INSERT failures across all 4 cells from 00:01-00:12 UTC. p99 INSERT latency stayed flat (~9.3-9.8ms) and GCL reported no deploy/config change in the window, so this is a cluster-side dropped-message / GC-pause event, not an app regression. The failures self-cleared to zero by 00:12; no action required beyond monitoring.';
const poolReportNailed =
  "Root cause: the payments v3.2.1 deploy leaked Postgres connections, exhausting the pool (pg_stat_activity climbed to max_connections at 14:32) and driving checkout p99 latency from 120ms to 2.1s with 'connection timeout' errors in the checkout logs. Rolling back v3.2.1 restored the pool.";
const poolReportPartial =
  "Checkout p99 latency spiked to 2.1s and we saw a wave of 'connection timeout' errors starting at 14:31, right after the payments v3.2.1 deploy. The database looked stressed. Likely something the deploy changed in how it talks to Postgres, but we did not isolate the exact mechanism.";
const poolReportSymptomOnly =
  'Checkout p99 latency exceeded the 2s threshold and the alert fired. Error rate on the checkout endpoint is elevated. Investigating.';
const oomReportWrong =
  'Root cause: a CDN cache misconfiguration dropped the cache hit rate, increasing origin load and causing the checkout 5xx spike. Recommend fixing the CDN TTL.';
const poolReportHallucination =
  "Root cause: the payments v3.2.1 deploy leaked Postgres connections and exhausted the pool (pg_stat_activity hit max_connections at 14:32), spiking checkout p99 latency with 'connection timeout' errors. Additionally, a concurrent Redis cluster failover at 14:20 took the session store offline and was a second independent cause of the outage.";
const cassandraReportBenignNailed =
  'This alert fired at the tail of a short burst of `auction_winner_by_id` INSERT failures that had already returned to zero by the time the 600s sustain gate was satisfied. The failures were fleet-wide and simultaneous with flat p99 latency and no GCL change events — a transient shared-Cassandra event that self-recovered. This is benign / self-resolved; no rollback or remediation is warranted.';

export interface AlertOutcomeRcaFixture {
  readonly suite: 'nailed' | 'partial' | 'symptom-only' | 'miss' | 'hallucination';
  readonly description: string;
  readonly confirmedRootCause: string;
  readonly investigationReport: string;
  /** Raw 0-3 grade the mocked judge returns, before the penalty. */
  readonly judgeScore: number;
  /** Deductive's human label: the effective score after the penalty. */
  readonly expectedScore: number;
  readonly expectedRootCauseMatch: boolean;
  readonly expectedMechanismMatch: boolean;
  readonly expectedEvidenceMatch: boolean;
  readonly expectedMateriallyWrongClaim: boolean;
  /** Mocked offending claim; set only when a materially wrong claim is expected. */
  readonly offendingClaim: string;
}

export const alertOutcomeRcaFixtures: readonly AlertOutcomeRcaFixture[] = [
  {
    suite: 'nailed',
    description: 'Real self-resolved Cassandra RCA that fully matches the confirmed cause.',
    confirmedRootCause: cassandraCause,
    investigationReport: cassandraReportNailed,
    judgeScore: 3,
    expectedScore: 3,
    expectedRootCauseMatch: true,
    expectedMechanismMatch: true,
    expectedEvidenceMatch: true,
    expectedMateriallyWrongClaim: false,
    offendingClaim: '',
  },
  {
    suite: 'nailed',
    description: 'Connection-pool-leak RCA with cause, mechanism, and evidence.',
    confirmedRootCause: poolCause,
    investigationReport: poolReportNailed,
    judgeScore: 3,
    expectedScore: 3,
    expectedRootCauseMatch: true,
    expectedMechanismMatch: true,
    expectedEvidenceMatch: true,
    expectedMateriallyWrongClaim: false,
    offendingClaim: '',
  },
  {
    suite: 'nailed',
    description: 'Benign self-resolution correctly nailed as transient with evidence.',
    confirmedRootCause: cassandraCause,
    investigationReport: cassandraReportBenignNailed,
    judgeScore: 3,
    expectedScore: 3,
    expectedRootCauseMatch: true,
    expectedMechanismMatch: true,
    expectedEvidenceMatch: true,
    expectedMateriallyWrongClaim: false,
    offendingClaim: '',
  },
  {
    suite: 'partial',
    description: 'Right direction and some signals, mechanism not isolated.',
    confirmedRootCause: poolCause,
    investigationReport: poolReportPartial,
    judgeScore: 2,
    expectedScore: 2,
    expectedRootCauseMatch: true,
    expectedMechanismMatch: false,
    expectedEvidenceMatch: true,
    expectedMateriallyWrongClaim: false,
    offendingClaim: '',
  },
  {
    suite: 'symptom-only',
    description: 'Confirms symptoms but does not progress toward the cause.',
    confirmedRootCause: poolCause,
    investigationReport: poolReportSymptomOnly,
    judgeScore: 1,
    expectedScore: 1,
    expectedRootCauseMatch: false,
    expectedMechanismMatch: false,
    expectedEvidenceMatch: false,
    expectedMateriallyWrongClaim: false,
    offendingClaim: '',
  },
  {
    suite: 'miss',
    description: 'Report confidently asserts a different, unrelated cause (materially-wrong miss).',
    confirmedRootCause: oomCause,
    investigationReport: oomReportWrong,
    judgeScore: 0,
    expectedScore: 0,
    expectedRootCauseMatch: false,
    expectedMechanismMatch: false,
    expectedEvidenceMatch: false,
    expectedMateriallyWrongClaim: true,
    offendingClaim: 'A CDN cache misconfiguration caused the checkout 5xx spike.',
  },
  {
    suite: 'hallucination',
    description: 'Correct cause plus a fabricated second cause triggers the -1 penalty.',
    confirmedRootCause: poolCause,
    investigationReport: poolReportHallucination,
    judgeScore: 3,
    expectedScore: 2,
    expectedRootCauseMatch: true,
    expectedMechanismMatch: true,
    expectedEvidenceMatch: true,
    expectedMateriallyWrongClaim: true,
    offendingClaim: 'A concurrent Redis cluster failover at 14:20 was a second independent cause.',
  },
];
