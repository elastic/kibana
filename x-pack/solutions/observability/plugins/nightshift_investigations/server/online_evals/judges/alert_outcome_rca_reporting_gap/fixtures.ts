/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ported from Deductive's alert_outcome_rca_reporting_gap/create_dataset.py. Strings are verbatim.
const cassandraCause =
  'A transient event on the shared `dd-cassandra-production-ads-serving` cluster caused fleet-wide `auction_winner_by_id` INSERT failures across all 4 cells from ~00:01-00:12 UTC that self-recovered; p99 INSERT latency stayed flat and GCL showed no change events.';
const poolCause =
  "A connection-pool leak from the payments v3.2.1 deploy exhausted the Postgres pool, spiking checkout p99 latency with 'connection timeout' errors.";
const poolTranscriptStrong =
  "human: Alert: checkout p99 latency > 2s.\n\nai: Checking recent deploys and DB health.\n\ntool: deploy_events -> payments v3.2.1 deployed 14:29 UTC.\n\ntool: pg_stat_activity -> active connections climbed to max_connections (200) at 14:32; many idle-in-transaction from payments pods.\n\ntool: checkout_logs -> 'connection timeout acquiring pool' errors starting 14:31.\n\nai: The v3.2.1 payments deploy is leaking Postgres connections and exhausting the pool, which is what is timing out checkout.";
const poolReportSymptomOnly =
  'Checkout p99 latency exceeded the 2s threshold and error rate is elevated. The alert fired at 14:35. Investigating further.';
const poolReportFull =
  "Root cause: the payments v3.2.1 deploy leaked Postgres connections, exhausting the pool (pg_stat_activity hit max_connections at 14:32) and causing 'connection timeout' errors that spiked checkout p99 latency. Roll back v3.2.1.";
const poolTranscriptSymptomOnly =
  'human: Alert: checkout p99 latency > 2s.\n\nai: Latency is elevated on the checkout endpoint; error rate is up. Continuing to look.\n\ntool: latency_metrics -> p99 2.1s (baseline 120ms).';
const cassandraTranscriptStrong =
  'human: Alert: [SP 2.0] auction persistence errors.\n\nai: Checking failure spread and change events.\n\ntool: promql per-cell failures -> auction_winner_by_id INSERT failures across all 4 cells simultaneously 00:01-00:12 UTC.\n\ntool: cassandra p99 -> stable ~9.5ms throughout.\n\ntool: gcl_change_events -> zero deploy/config changes in window.\n\nai: Fleet-wide simultaneous failures with flat latency and no change events point to a transient shared-Cassandra event that self-recovered.';
const cassandraReportFull =
  'Root cause: a transient event on the shared dd-cassandra-production-ads-serving cluster caused simultaneous auction_winner_by_id INSERT failures across all 4 cells (00:01-00:12 UTC) with flat p99 latency and no GCL change events; it self-recovered. Benign/self-resolved.';

export interface AlertOutcomeRcaReportingGapFixture {
  readonly suite: 'gap' | 'no-gap';
  readonly description: string;
  readonly confirmedCause: string;
  readonly transcript: string;
  readonly investigationReport: string;
  readonly causeInTranscript: number;
  readonly causeInReport: number;
  readonly expectedGap: boolean;
}

export const alertOutcomeRcaReportingGapFixtures: readonly AlertOutcomeRcaReportingGapFixture[] = [
  {
    suite: 'gap',
    description: 'Transcript nails the cause; report only restates symptoms.',
    confirmedCause: poolCause,
    transcript: poolTranscriptStrong,
    investigationReport: poolReportSymptomOnly,
    causeInTranscript: 3,
    causeInReport: 1,
    expectedGap: true,
  },
  {
    suite: 'no-gap',
    description: 'Transcript and report both fully capture the cause.',
    confirmedCause: poolCause,
    transcript: poolTranscriptStrong,
    investigationReport: poolReportFull,
    causeInTranscript: 3,
    causeInReport: 3,
    expectedGap: false,
  },
  {
    suite: 'no-gap',
    description: 'Cause absent from both transcript and report (no gap, low recall).',
    confirmedCause: poolCause,
    transcript: poolTranscriptSymptomOnly,
    investigationReport: poolReportSymptomOnly,
    causeInTranscript: 1,
    causeInReport: 1,
    expectedGap: false,
  },
  {
    suite: 'no-gap',
    description: 'Real self-resolution reported faithfully.',
    confirmedCause: cassandraCause,
    transcript: cassandraTranscriptStrong,
    investigationReport: cassandraReportFull,
    causeInTranscript: 3,
    causeInReport: 3,
    expectedGap: false,
  },
  {
    suite: 'gap',
    description: 'Transcript establishes self-resolution; report omits it.',
    confirmedCause: cassandraCause,
    transcript: cassandraTranscriptStrong,
    investigationReport:
      'Auction persistence errors fired on SP-V4. Error counts were elevated around 00:12 UTC. Recommend paging the ads-serving on-call to investigate.',
    causeInTranscript: 3,
    causeInReport: 1,
    expectedGap: true,
  },
  {
    suite: 'no-gap',
    description: 'Equal partial progress in transcript and report (no gap).',
    confirmedCause: poolCause,
    transcript:
      'human: Alert: checkout p99 latency > 2s.\n\nai: Checking deploys.\n\ntool: deploy_events -> payments v3.2.1 deployed 14:29 UTC.\n\nai: A payments deploy landed right before the spike; likely related to how it uses the DB.',
    investigationReport:
      'Checkout latency spiked right after the payments v3.2.1 deploy at 14:29; the deploy likely changed database behavior. Root cause not fully isolated.',
    causeInTranscript: 2,
    causeInReport: 2,
    expectedGap: false,
  },
];
