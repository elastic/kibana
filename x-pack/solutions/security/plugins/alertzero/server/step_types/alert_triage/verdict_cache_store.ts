/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../common/step_types/triage_decisions_index';
import {
  readCacheRecord,
  verdictCacheId,
  type VerdictCacheRecord,
} from '../../alert_triage/verdict_cache';
import { statusCodeOf } from './ports';

/** Ids per `mget`, well under the request size limit. */
const MGET_CHUNK = 1000;

interface MgetDoc {
  _id: string;
  found?: boolean;
  _source?: Record<string, unknown>;
  _seq_no?: number;
  _primary_term?: number;
  error?: { type?: string; reason?: string };
}

export interface StoredRecord {
  /** Undefined when the document is not a readable record (another type, a retired lifecycle, a missing field). */
  record: VerdictCacheRecord | undefined;
  seqNo: number;
  primaryTerm: number;
}

/**
 * The stored records of the given key hashes, by hash, read by id (no search, so no mapping is needed). A hash with no
 * document has no entry. A document that is not a readable record has an entry with no record, so that a write can replace it
 * with a guard on its version. A missing index means no records. Any other document that could not be read throws: written
 * over a record that was not read, a pending record could lose its run 1.
 */
export const readCacheRecords = async ({
  mget,
  hashes,
}: {
  mget: (params: { index: string; ids: string[] }) => Promise<unknown>;
  hashes: readonly string[];
}): Promise<Map<string, StoredRecord>> => {
  const stored = new Map<string, StoredRecord>();
  const idToHash = new Map(hashes.map((hash) => [verdictCacheId(hash), hash]));
  const ids = [...idToHash.keys()];
  for (let from = 0; from < ids.length; from += MGET_CHUNK) {
    let response: { docs: MgetDoc[] };
    try {
      response = (await mget({
        index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
        ids: ids.slice(from, from + MGET_CHUNK),
      })) as { docs: MgetDoc[] };
    } catch (error) {
      if (statusCodeOf(error) === 404) return stored;
      throw error;
    }
    for (const doc of response.docs) {
      // Before the first write the index does not exist. `_mget` then answers 200 with this error on each document.
      if (doc.error?.type === 'index_not_found_exception') continue;
      if (doc.error !== undefined) {
        throw new Error(
          `Verdict cache record ${doc._id} could not be read: ${doc.error.type ?? 'unknown'} ${
            doc.error.reason ?? ''
          }`.trim()
        );
      }
      const hash = idToHash.get(doc._id);
      if (doc.found !== true || hash === undefined) continue;
      stored.set(hash, {
        record: readCacheRecord(doc._source),
        seqNo: doc._seq_no ?? 0,
        primaryTerm: doc._primary_term ?? 0,
      });
    }
  }
  return stored;
};
