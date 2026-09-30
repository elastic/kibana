/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RehydrateProcessSelectors } from './read_current_run_state';
import type { ProcessSelector } from './types';

/** 50 events + 50 alerts is the SSE schema's own ceiling on each array. */
const MAX_REHYDRATE_DOCS = 100;
/** Bounds fan-out; an isolate-host-sized proposal count per host was already a lot. */
const MAX_PROCESS_SELECTORS_PER_HOST = 5;

const REHYDRATE_SOURCE_FIELDS = [
  '@timestamp',
  'host.name',
  'host.hostname',
  'agent.id',
  'process.entity_id',
  'process.pid',
  'process.name',
  'process.executable',
  'event.type',
  'event.action',
];

interface RehydrateSource {
  '@timestamp'?: string;
  host?: { name?: string; hostname?: string };
  process?: { entity_id?: string; pid?: number; name?: string; executable?: string };
  event?: { type?: string | string[]; action?: string | string[] };
}

interface RehydrateRef {
  index: string;
  id: string;
  matched?: { technique_id?: string };
}

interface Candidate {
  hostName: string;
  processKey: string;
  pid?: number;
  entityId?: string;
  processName: string;
  timestamp: string;
  /** From a technique-attributed SSE ref, not a plain Tier 1 sample; preferred on dedupe. */
  techniqueMatched: boolean;
}

const asTypeList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const buildSummary = (candidate: Candidate): string => {
  const idPart =
    candidate.entityId !== undefined && candidate.pid !== undefined
      ? `pid ${candidate.pid}, entity_id ${candidate.entityId}`
      : candidate.entityId !== undefined
      ? `entity_id ${candidate.entityId}`
      : `pid ${candidate.pid}`;
  return `${candidate.processName} (${idPart}) observed ${candidate.timestamp}; the process may have exited`;
};

const extractCandidate = (source: RehydrateSource, ref: RehydrateRef): Candidate | undefined => {
  const hostName = source.host?.name ?? source.host?.hostname;
  if (!hostName) {
    return undefined;
  }
  const entityId = source.process?.entity_id;
  const pid = typeof source.process?.pid === 'number' ? source.process.pid : undefined;
  if (entityId === undefined && pid === undefined) {
    return undefined;
  }
  if (asTypeList(source.event?.type).some((type) => type.toLowerCase().includes('end'))) {
    return undefined;
  }
  return {
    hostName,
    processKey: entityId !== undefined ? `entity_id:${entityId}` : `pid:${pid}`,
    pid,
    entityId,
    processName: source.process?.name ?? source.process?.executable ?? 'unknown process',
    timestamp: source['@timestamp'] ?? new Date(0).toISOString(),
    techniqueMatched: Boolean(ref.matched?.technique_id),
  };
};

/** True when `next` should replace `current` in the dedupe map: a technique-attributed ref wins
 *  outright, and within the same attribution tier the newest observation wins. */
const isBetterCandidate = (next: Candidate, current: Candidate): boolean =>
  next.techniqueMatched !== current.techniqueMatched
    ? next.techniqueMatched
    : next.timestamp > current.timestamp;

/**
 * Builds process selectors from the SSE's own event/alert refs via one `mget`, so kill-process
 * and suspend-process can fill from whatever process telemetry the hunt actually surfaced.
 */
export const makeRehydrateProcessSelectors = (
  esClient: ElasticsearchClient,
  logger?: Logger
): RehydrateProcessSelectors => {
  return async ({ alerts, events }) => {
    const refs: RehydrateRef[] = [
      ...events.map((event) => ({
        index: event.source_index,
        id: event.event_id,
        matched: event.matched,
      })),
      ...alerts.map((alert) => ({ index: alert.index, id: alert.alert_id })),
    ].slice(0, MAX_REHYDRATE_DOCS);

    if (refs.length === 0) {
      return [];
    }

    let docs;
    try {
      const response = await esClient.mget<RehydrateSource>({
        docs: refs.map((ref) => ({
          _index: ref.index,
          _id: ref.id,
          _source: REHYDRATE_SOURCE_FIELDS,
        })),
      });
      docs = response.docs;
    } catch (err) {
      logger?.warn(
        `rehydrateProcessSelectors: mget failed, returning no process selectors — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return [];
    }

    let inaccessibleCount = 0;
    const candidates: Candidate[] = [];
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if ('error' in doc) {
        inaccessibleCount += 1;
        continue;
      }
      if (!doc.found || !doc._source) {
        continue;
      }
      const candidate = extractCandidate(doc._source, refs[i]);
      if (candidate) {
        candidates.push(candidate);
      }
    }
    if (inaccessibleCount > 0) {
      logger?.warn(
        `rehydrateProcessSelectors: ${inaccessibleCount} of ${refs.length} document(s) could not ` +
          `be read (permission or missing-index errors); continuing with what was found.`
      );
    }

    const byKey = new Map<string, Candidate>();
    for (const candidate of candidates) {
      const key = `${candidate.hostName}|${candidate.processKey}`;
      const existing = byKey.get(key);
      if (!existing || isBetterCandidate(candidate, existing)) {
        byKey.set(key, candidate);
      }
    }

    const byHost = new Map<string, Candidate[]>();
    for (const candidate of byKey.values()) {
      const list = byHost.get(candidate.hostName) ?? [];
      list.push(candidate);
      byHost.set(candidate.hostName, list);
    }

    const selectors: ProcessSelector[] = [];
    for (const list of byHost.values()) {
      const capped = list
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
        .slice(0, MAX_PROCESS_SELECTORS_PER_HOST);
      for (const candidate of capped) {
        selectors.push({
          pid: candidate.pid,
          entityId: candidate.entityId,
          processKey: candidate.processKey,
          hostName: candidate.hostName,
          observedAt: candidate.timestamp,
          summary: buildSummary(candidate),
        });
      }
    }
    return selectors;
  };
};
