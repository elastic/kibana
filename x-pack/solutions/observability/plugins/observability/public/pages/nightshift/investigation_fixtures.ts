/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Genuine client-side fixture data — there is no `Investigation`
 * schema/API in this branch (confirmed by search; it exists only on a
 * separate, unmerged PR researched in
 * threads/nightshift-rd/artifacts/04-joe-reuter-investigations.md). Kate's
 * own prototype is itself a static HTML mockup, so matching that fidelity
 * here is a deliberate choice, not a shortcut. Shape loosely follows the
 * real (unmerged) `InvestigationResult` type: contributing_factors,
 * confidence, mechanism, alternatives_ruled_out, gaps_found — plus a
 * `status`/`goal` pair for the list-level Complete/Investigating states
 * seen in Kate's prototype.
 */

export interface InvestigationFixture {
  id: string;
  title: string;
  status: 'complete' | 'investigating';
  hypothesesCount: number;
  goal: string;
  conclusion?: string;
  contributingFactors?: string;
  mechanism?: string;
  alternativesRuledOut?: Array<{ candidate: string; reason: string }>;
  recommendedNextSteps: string[];
}

const EVENT_ID_TO_INVESTIGATIONS: Record<string, InvestigationFixture[]> = {
  'evt-demo-transactionhistory-1': [
    {
      id: 'inv-txhist-preliminary',
      title: 'Preliminary investigation',
      status: 'complete',
      hypothesesCount: 1,
      goal: 'Review transactionhistory, balancereader, and ledgerwriter logs around 14:30 UTC to understand whether the outage originates from ledger-db connectivity or a shared cache-layer failure.',
      conclusion:
        'Logs confirm all three services are failing off the same ledger-db outage: transactionhistory cannot obtain SQL connections (SQLState 08001), and its HikariCP pool repeatedly fails to initialize. balancereader and ledgerwriter fail as downstream effects, not independent causes.',
      recommendedNextSteps: [
        'Check ledger-db directly for connection limits or an unplanned restart around 14:30 UTC',
        'Do not restart transactionhistory or balancereader — they will fail again immediately until ledger-db recovers',
      ],
    },
    {
      id: 'inv-txhist-ledgerdb-contributing-factors',
      title: 'Ledger-db connectivity contributing-factors',
      status: 'investigating',
      hypothesesCount: 2,
      goal: 'Determine why ledger-db is rejecting connections from transactionhistory and balancereader — check for connection pool exhaustion, an unplanned restart, or a network-level change between the services and the database.',
      recommendedNextSteps: [
        'Check ledger-db\'s own connection count and max_connections setting for the affected window',
        'Confirm no network policy or security-group change was deployed around 14:30 UTC',
      ],
    },
  ],
  'evt-demo-checkout-latency-1': [
    {
      id: 'inv-checkout-gw-latency',
      title: 'Payment gateway latency contributing-factors',
      status: 'complete',
      hypothesesCount: 1,
      goal: 'Determine whether the checkout latency spike originates in checkout\'s own code path or in the external payment gateway.',
      conclusion:
        'The slowdown is entirely on the payment gateway side. checkout\'s own resource usage (CPU/memory/connections) stayed flat throughout, and the timing lines up exactly with the gateway\'s own status page reporting elevated latency.',
      contributingFactors:
        'External payment gateway p99 latency increase, unrelated to any recent checkout deploy or configuration change.',
      mechanism:
        'checkout calls the payment gateway synchronously during checkout submission. As the gateway\'s own response time degraded from ~400ms to over 6s, checkout requests queued behind the slow calls, delaying both order confirmation and the confirmation email send.',
      alternativesRuledOut: [
        {
          candidate: 'checkout service resource exhaustion',
          reason: 'CPU, memory, and connection pool usage remained flat throughout the incident window',
        },
        {
          candidate: 'Recent checkout deploy or config change',
          reason: 'No deploy or config change was recorded in the 2 hours preceding onset',
        },
      ],
      recommendedNextSteps: [
        'Enable the payment gateway circuit breaker to fail fast instead of queueing',
        'Post a customer-facing banner about delayed order confirmations',
      ],
    },
  ],
};

export function getInvestigationsForEvent(eventId: string): InvestigationFixture[] {
  return EVENT_ID_TO_INVESTIGATIONS[eventId] ?? [];
}
