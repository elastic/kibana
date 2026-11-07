/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichPolicy, IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Enrichment policies the regression dataset's gold queries reference.
 *
 * Two golds run an `ENRICH` step (`win_events` on example 25, `ldap_lookup_new`
 * on example 28). A policy no part of the suite provisions makes those examples
 * unanswerable rather than hard: the cluster rejects the query before execution
 * with `verification_exception … cannot find enrich policy [<name>]`, so
 * `ES|QL Result Equivalence` reports the same `goldError` for every model and
 * candidates that do perform the requested ENRICH step fail execution on the
 * same missing artifact. The example then measures the fixture gap instead of
 * the model.
 *
 * Each fixture therefore carries (a) the source index and the lookup documents
 * the policy is built from, (b) the policy itself, and (c) a probe query whose
 * validation fails in exactly the same way the gold does when the policy is
 * missing — or present but never executed, which is an equally unusable state.
 */
export interface EsqlEnrichPolicyFixture {
  /** Policy name the gold's `ENRICH <name>` step references. */
  readonly policyName: string;
  /** Source index the policy reads its lookup values from. */
  readonly sourceIndexCreateRequest: IndicesCreateRequest;
  /** Lookup documents indexed into the source index before the policy executes. */
  readonly sourceDocuments: ReadonlyArray<Record<string, unknown>>;
  /** The `match` policy body to install, without its name. */
  readonly policy: Omit<EnrichPolicy, 'name'>;
  /** Minimal ES|QL query that only validates once the policy resolves on the cluster. */
  readonly probeQuery: string;
}

/** Windows event-code lookup: `ENRICH win_events ON event.code WITH EVENT_DESCRIPTION`. */
export const winEventsEnrichPolicyFixture: EsqlEnrichPolicyFixture = {
  policyName: 'win_events',
  sourceIndexCreateRequest: {
    index: 'esql-enrich-win-events',
    mappings: {
      properties: {
        'event.code': { type: 'long' },
        EVENT_DESCRIPTION: { type: 'keyword' },
      },
    },
  },
  sourceDocuments: [
    { 'event.code': 4624, EVENT_DESCRIPTION: 'An account was successfully logged on' },
    { 'event.code': 4625, EVENT_DESCRIPTION: 'An account failed to log on' },
    { 'event.code': 4688, EVENT_DESCRIPTION: 'A new process has been created' },
    { 'event.code': 4104, EVENT_DESCRIPTION: 'Script block logging' },
    { 'event.code': 1, EVENT_DESCRIPTION: 'Process creation' },
  ],
  policy: {
    indices: ['esql-enrich-win-events'],
    match_field: 'event.code',
    enrich_fields: ['EVENT_DESCRIPTION'],
  },
  probeQuery: 'FROM logs-* | ENRICH win_events ON event.code WITH EVENT_DESCRIPTION | LIMIT 1',
};

/** Directory lookup: `ENRICH ldap_lookup_new ON user.name` (yields `group.name`). */
export const ldapLookupEnrichPolicyFixture: EsqlEnrichPolicyFixture = {
  policyName: 'ldap_lookup_new',
  sourceIndexCreateRequest: {
    index: 'esql-enrich-ldap-users',
    mappings: {
      properties: {
        'user.name': { type: 'keyword' },
        'group.name': { type: 'keyword' },
      },
    },
  },
  sourceDocuments: [
    { 'user.name': 'alice', 'group.name': 'Domain Admins' },
    { 'user.name': 'bob', 'group.name': 'Engineering' },
    { 'user.name': 'svc_backup', 'group.name': 'Backup Operators' },
  ],
  policy: {
    indices: ['esql-enrich-ldap-users'],
    match_field: 'user.name',
    enrich_fields: ['group.name'],
  },
  probeQuery: 'FROM logs-* | ENRICH ldap_lookup_new ON user.name WITH group.name | LIMIT 1',
};

export const esqlFixtureEnrichPolicies: readonly EsqlEnrichPolicyFixture[] = [
  winEventsEnrichPolicyFixture,
  ldapLookupEnrichPolicyFixture,
];

/** Policy names the fixtures install. */
export const esqlFixtureEnrichPolicyNames: readonly string[] = esqlFixtureEnrichPolicies.map(
  (fixture) => fixture.policyName
);

/**
 * Wildcard covering the enrich source indices, kept in `src/fixtures/enrich.ts`
 * so `./indices.ts` stays the single list of dataset indices.
 */
export const esqlFixtureEnrichIndexWildcards: readonly string[] = ['esql-enrich-*'];

const ENRICH_STEP = /\benrich\s+([a-z0-9_$.+-]+)/gi;

/**
 * Policy names an ES|QL query's `ENRICH` steps reference. Used by the setup
 * guard (and its test) so a gold cannot start referencing a policy the fixtures
 * never install without failing loudly.
 */
export function enrichPolicyNamesInQuery(query: string): string[] {
  const names: string[] = [];
  for (const match of query.matchAll(ENRICH_STEP)) {
    names.push(match[1]);
  }
  return names;
}

/** Policy names referenced by any gold query in the dataset. */
export function enrichPolicyNamesInGoldQueries(goldQueries: readonly string[]): string[] {
  return Array.from(new Set(goldQueries.flatMap(enrichPolicyNamesInQuery)));
}

/** Gold queries of a dataset, dropping examples that carry no ground-truth output. */
export function goldQueriesFromDataset(
  dataset: ReadonlyArray<{ output?: { query?: string } }>
): string[] {
  return dataset.flatMap((example) => (example.output?.query ? [example.output.query] : []));
}
