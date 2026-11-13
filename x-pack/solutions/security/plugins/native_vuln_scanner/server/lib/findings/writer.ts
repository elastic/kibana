/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Finding } from '../matcher';
import { FINDINGS_INDEX } from './constants';
import type { FindingDoc, HostMeta } from './finding_doc';
import { toFindingDoc } from './finding_doc';

const BULK_BATCH = 500;
const HOST_BATCH = 1000;

/**
 * Runs on an existing finding: takes the fresh document, keeps the first sighting, and moves
 * the state forward (fixed -> reopened, anything else -> active).
 */
export const UPSERT_SCRIPT = `
def prev = ctx._source.native_vuln_scanner;
def firstSeen = prev == null ? params.doc.native_vuln_scanner.first_seen : prev.first_seen;
def created = ctx._source.event == null ? params.doc.event.created : ctx._source.event.created;
def state = prev != null && prev.state == 'fixed' ? 'reopened' : 'active';
ctx._source.clear();
ctx._source.putAll(params.doc);
ctx._source.native_vuln_scanner.first_seen = firstSeen;
ctx._source.native_vuln_scanner.state = state;
ctx._source.event.created = created;
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
  /** Bulk item failures as `<status>:<error type>` -> count. */
  failures: Record<string, number>;
}

export class FindingsWriteError extends Error {
  constructor(public readonly failures: Record<string, number>) {
    super(`Failed to write vulnerability findings: ${JSON.stringify(failures)}`);
    this.name = 'FindingsWriteError';
  }
}

const bulkOperations = (docs: readonly FindingDoc[]): Array<BulkOperationContainer | object> =>
  docs.flatMap((doc) => [
    { update: { _index: FINDINGS_INDEX, _id: doc.event.id, retry_on_conflict: 3 } },
    { script: { source: UPSERT_SCRIPT, lang: 'painless', params: { doc } }, upsert: doc },
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
  { hosts, findings, now, runId, signal }: WriteFindingsParams
): Promise<WriteFindingsResult> => {
  const metaById = new Map(hosts.map((host) => [host.id, host]));
  const docs = new Map<string, FindingDoc>();
  for (const finding of findings) {
    const host = metaById.get(finding.hostId);
    if (!host) throw new Error(`Finding for host ${finding.hostId} has no host metadata`);
    const doc = toFindingDoc(finding, host, { now, runId });
    docs.set(doc.event.id, doc);
  }

  const failures: Record<string, number> = {};
  const all = [...docs.values()];
  let written = 0;
  for (let i = 0; i < all.length; i += BULK_BATCH) {
    const batch = all.slice(i, i + BULK_BATCH);
    const response = await es.bulk(
      { operations: bulkOperations(batch), refresh: false },
      { signal }
    );
    written += batch.length - countFailures(response, failures);
  }
  if (Object.keys(failures).length > 0) throw new FindingsWriteError(failures);
  if (hosts.length === 0) return { written, fixed: 0, fixSkipped: 0, failures };

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
  return { written, fixed, fixSkipped, failures };
};
