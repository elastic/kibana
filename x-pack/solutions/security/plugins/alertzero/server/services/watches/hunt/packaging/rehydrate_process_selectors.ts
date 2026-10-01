/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ProcessSelector } from './types';

/**
 * Re-reads the process documents an SSE referenced and returns the selectors a kill/suspend
 * proposal can be built from. Declared here, with its only implementation, so the run-state
 * reader that consumes it depends on this module rather than the other way round.
 */
export type RehydrateProcessSelectors = (args: {
  alerts: Array<{ alert_id: string; index: string }>;
  events: Array<{
    event_id: string;
    source_index: string;
    /** Present when the SSE attributed this event to a technique; preferred over a plain sample ref during dedupe. */
    matched?: { technique_id?: string };
  }>;
}) => Promise<ProcessSelector[]>;

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
  matched?: { technique_id?: string; ioc?: true };
}

interface Candidate {
  hostName: string;
  processKey: string;
  pid?: number;
  entityId?: string;
  processName: string;
  timestamp: string;
  /**
   * From a technique-attributed SSE ref, not a plain Tier 1 sample; preferred on dedupe, and
   * carried onto the selector so the proposal comment can name the one technique this process
   * is implicated in.
   */
  techniqueId?: string;
  /** The ref that produced this candidate was the Tier 1 IOC match; OR-ed across refs on dedupe. */
  iocMatched: boolean;
}

const asTypeList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

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
    techniqueId: ref.matched?.technique_id,
    iocMatched: ref.matched?.ioc === true,
  };
};

/** True when `next` should replace `current` in the dedupe map: a technique-attributed ref wins
 *  outright, and within the same attribution tier the newest observation wins. */
const isBetterCandidate = (next: Candidate, current: Candidate): boolean =>
  Boolean(next.techniqueId) !== Boolean(current.techniqueId)
    ? Boolean(next.techniqueId)
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
      if (!existing) {
        byKey.set(key, candidate);
        continue;
      }
      // A process that matched an IOC in one ref stays matched even when a newer or
      // technique-attributed ref wins the slot.
      const iocMatched = existing.iocMatched || candidate.iocMatched;
      byKey.set(key, {
        ...(isBetterCandidate(candidate, existing) ? candidate : existing),
        iocMatched,
      });
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
          processName: candidate.processName,
          techniqueId: candidate.techniqueId,
          iocMatched: candidate.iocMatched,
        });
      }
    }
    return selectors;
  };
};
