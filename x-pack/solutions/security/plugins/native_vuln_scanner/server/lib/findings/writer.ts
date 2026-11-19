/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KevEntries } from '../enrichment/kev';
import type { Finding } from '../matcher';
import { FINDINGS_INDEX } from './constants';
import type { FindingDoc, HostMeta } from './finding_doc';
import { toFindingDoc } from './finding_doc';

const BULK_BATCH = 500;
const HOST_BATCH = 1000;

/**
 * Runs on an existing finding: takes the fresh document, keeps the first sighting, and moves
 * the state forward (fixed -> reopened, anything else -> active). `event.created` is kept except
 * on a reopen, where it restarts. Detection rules filter on `event.created >= <rule creation>`, so
 * the reset lets a finding first seen before the rule existed match again when it reopens. How
 * often that alerts depends on the license; see the README.
 *
 * Unfixed docs (no vendor fix yet) stay `unfixed`: they never alert and are not `new`. When a
 * fix later ships, the incoming fixed doc reopens them (and resets `event.created`), so rules
 * created in between can fire.
 *
 * `vulnerability.kev` comes from the fresh document, except when the run had no KEV catalog
 * (`keepKev`): then the stored block is copied forward so an outage does not erase it.
 */
export const UPSERT_SCRIPT = `
def prev = ctx._source.native_vuln_scanner;
def firstSeen = prev == null ? params.doc.native_vuln_scanner.first_seen : prev.first_seen;
def state;
if (prev == null) {
  state = params.doc.native_vuln_scanner.state;
} else if (params.doc.native_vuln_scanner.unfixed == true) {
  state = 'unfixed';
} else if (prev.state == 'fixed' || prev.state == 'unfixed') {
  state = 'reopened';
} else {
  state = 'active';
}
def created = state == 'reopened' || ctx._source.event == null ? params.doc.event.created : ctx._source.event.created;
def prevKev = ctx._source.vulnerability == null ? null : ctx._source.vulnerability.kev;
ctx._source.clear();
ctx._source.putAll(params.doc);
ctx._source.native_vuln_scanner.first_seen = firstSeen;
ctx._source.native_vuln_scanner.state = state;
ctx._source.event.created = created;
if (params.keepKev == true && params.doc.vulnerability.kev == null && prevKev != null) {
  ctx._source.vulnerability.kev = prevKev;
}
`;

export const FIX_SCRIPT = `
ctx._source.native_vuln_scanner.state = 'fixed';
ctx._source.native_vuln_scanner.fixed_at = params.now;
ctx._source['@timestamp'] = params.now;
`;

export interface WriteFindingsParams {
  /** Hosts whose inventory was matched in full this run; only their absent findings get fixed. */
  hosts: readonly HostMeta[];
  findings: readonly Finding[];
  now: string;
  runId: string;
  /**
   * Whether this run's feed included unfixed rows, per release. When false, unfixed docs are
   * excluded from the fix pass: a run without unfixed rows must not mass-close them.
   */
  unfixedScanned: boolean;
  /** CISA KEV catalog; findings of listed CVEs get a `vulnerability.kev` block. */
  kev?: KevEntries;
  /**
   * True when this run had no KEV catalog at all: a finding without a `kev` block keeps the one
   * it already has. False when the catalog (even a stale copy) is the truth for this run.
   */
  keepKev?: boolean;
  signal?: AbortSignal;
}

export interface WriteFindingsResult {
  written: number;
  fixed: number;
  /**
   * Open findings the fix pass could not update (version conflicts with a concurrent write, or
   * per-document failures). They stay open and the next run reconciles them.
   */
  fixSkipped: number;
  /** Findings built with a `vulnerability.kev` block this run. */
  kevListed: number;
  /** Bulk item failures as `<status>:<error type>` -> count. */
  failures: Record<string, number>;
}

export class FindingsWriteError extends Error {
  constructor(public readonly failures: Record<string, number>) {
    super(`Failed to write vulnerability findings: ${JSON.stringify(failures)}`);
    this.name = 'FindingsWriteError';
  }
}

const bulkOperations = (
  docs: readonly FindingDoc[],
  keepKev: boolean
): Array<BulkOperationContainer | object> =>
  docs.flatMap((doc) => [
    { update: { _index: FINDINGS_INDEX, _id: doc.event.id, retry_on_conflict: 3 } },
    {
      script: { source: UPSERT_SCRIPT, lang: 'painless', params: { doc, keepKev } },
      upsert: doc,
    },
  ]);

const countFailures = (response: BulkResponse, failures: Record<string, number>): number => {
  let failed = 0;
  if (!response.errors) return failed;
  for (const item of response.items) {
    const result = item.update ?? item.index ?? item.create;
    if (!result?.error) continue;
    failed++;
    const key = `${result.status}:${result.error.type}`;
    failures[key] = (failures[key] ?? 0) + 1;
  }
  return failed;
};

/**
 * Upserts this run's findings, then marks every open finding of a scanned host that this run
 * did not see as fixed. Throws {@link FindingsWriteError} before the fix pass when any upsert
 * failed, so a partial write never turns open findings into fixed ones.
 */
export const writeFindings = async (
  es: ElasticsearchClient,
  { hosts, findings, now, runId, unfixedScanned, kev, keepKev = false, signal }: WriteFindingsParams
): Promise<WriteFindingsResult> => {
  const metaById = new Map(hosts.map((host) => [host.id, host]));
  const docs = new Map<string, FindingDoc>();
  for (const finding of findings) {
    const host = metaById.get(finding.hostId);
    if (!host) throw new Error(`Finding for host ${finding.hostId} has no host metadata`);
    const doc = toFindingDoc(finding, host, { now, runId, kev: kev?.get(finding.cve.id) });
    docs.set(doc.event.id, doc);
  }

  const failures: Record<string, number> = {};
  const all = [...docs.values()];
  const kevListed = all.filter((doc) => doc.vulnerability.kev).length;
  let written = 0;
  for (let i = 0; i < all.length; i += BULK_BATCH) {
    const batch = all.slice(i, i + BULK_BATCH);
    const response = await es.bulk(
      { operations: bulkOperations(batch, keepKev), refresh: false },
      { signal }
    );
    written += batch.length - countFailures(response, failures);
  }
  if (Object.keys(failures).length > 0) throw new FindingsWriteError(failures);
  if (hosts.length === 0) return { written, fixed: 0, fixSkipped: 0, kevListed, failures };

  await es.indices.refresh({ index: FINDINGS_INDEX }, { signal });
  const hostIds = [...metaById.keys()];
  let fixed = 0;
  let fixSkipped = 0;
  for (let i = 0; i < hostIds.length; i += HOST_BATCH) {
    const {
      updated = 0,
      version_conflicts: conflicts = 0,
      failures: fixFailures = [],
    } = await es.updateByQuery(
      {
        index: FINDINGS_INDEX,
        conflicts: 'proceed',
        refresh: true,
        query: {
          bool: {
            filter: [{ terms: { 'host.id': hostIds.slice(i, i + HOST_BATCH) } }],
            must_not: [
              { term: { 'native_vuln_scanner.state': 'fixed' } },
              { term: { 'native_vuln_scanner.run_id': runId } },
              ...(unfixedScanned ? [] : [{ term: { 'native_vuln_scanner.unfixed': true } }]),
            ],
          },
        },
        script: { source: FIX_SCRIPT, lang: 'painless', params: { now } },
      },
      { signal }
    );
    fixed += updated;
    fixSkipped += conflicts + fixFailures.length;
  }
  return { written, fixed, fixSkipped, kevListed, failures };
};
