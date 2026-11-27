/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AdvisorySource, KnowledgeEntry } from '../feeds/types';
import { BULK_BATCH, KNOWLEDGE_INDEX, LAST_SEEN_REFRESH_MS, MGET_BATCH } from './constants';
import type { KnowledgeDoc } from './knowledge_doc';
import { toKnowledgeDoc } from './knowledge_doc';

export interface KnowledgeWriteResult {
  written: number;
  unchanged: number;
  failed: number;
}

export interface WriteKnowledgeParams {
  /** KB doc ids this run's findings use, e.g. `cve:ubuntu:noble:CVE-2026-1`. */
  ids: ReadonlySet<string>;
  knowledge: ReadonlyMap<string, KnowledgeEntry>;
  source: AdvisorySource;
  os: { family: string; version: string };
  attribution?: string;
  snapshotTime?: string;
  now: string;
  signal?: AbortSignal;
}

interface StoredDoc {
  content_hash?: string;
  last_seen_in_feed?: string;
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const countFailures = (response: BulkResponse): number =>
  response.errors ? response.items.filter((item) => Object.values(item)[0]?.error).length : 0;

/**
 * Writes the KB docs the run's findings reference. One `mget` per 1000 ids reads the stored
 * `content_hash`; only docs whose hash changed (or that are new) are indexed. An unchanged doc
 * gets a partial update of `last_seen_in_feed`, at most once a day.
 */
export const writeKnowledge = async (
  es: ElasticsearchClient,
  { ids, knowledge, source, os, attribution, snapshotTime, now, signal }: WriteKnowledgeParams
): Promise<KnowledgeWriteResult> => {
  const docs = new Map<string, KnowledgeDoc>();
  for (const id of ids) {
    const entry = knowledge.get(id);
    if (entry)
      docs.set(id, toKnowledgeDoc(id, entry, { source, os, attribution, snapshotTime, now }));
  }

  const result: KnowledgeWriteResult = { written: 0, unchanged: 0, failed: 0 };
  const toIndex: KnowledgeDoc[] = [];
  const toTouch: string[] = [];
  for (const batch of chunk([...docs.keys()], MGET_BATCH)) {
    const { docs: stored } = await es.mget<StoredDoc>(
      { index: KNOWLEDGE_INDEX, ids: batch, _source: ['content_hash', 'last_seen_in_feed'] },
      { signal }
    );
    stored.forEach((hit, i) => {
      const id = batch[i];
      const doc = docs.get(id);
      if (!doc) return;
      const found = 'found' in hit && hit.found ? hit._source : undefined;
      if (found?.content_hash !== doc.content_hash) {
        toIndex.push(doc);
        return;
      }
      result.unchanged++;
      const lastSeen = found?.last_seen_in_feed ? Date.parse(found.last_seen_in_feed) : NaN;
      if (!Number.isFinite(lastSeen) || Date.parse(now) - lastSeen >= LAST_SEEN_REFRESH_MS) {
        toTouch.push(id);
      }
    });
  }

  for (const batch of chunk(toIndex, BULK_BATCH)) {
    const response = await es.bulk(
      {
        operations: batch.flatMap((doc) => [
          { index: { _index: KNOWLEDGE_INDEX, _id: doc.native_vuln_scanner.knowledge_id } },
          doc,
        ]),
        refresh: false,
      },
      { signal }
    );
    const failed = countFailures(response);
    result.failed += failed;
    result.written += batch.length - failed;
  }

  // A failed touch only delays the next refresh; it is neither a write nor a failure.
  for (const batch of chunk(toTouch, BULK_BATCH)) {
    await es.bulk(
      {
        operations: batch.flatMap((id) => [
          { update: { _index: KNOWLEDGE_INDEX, _id: id } },
          { doc: { last_seen_in_feed: now } },
        ]),
        refresh: false,
      },
      { signal }
    );
  }
  return result;
};
