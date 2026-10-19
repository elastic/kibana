/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineEvent } from '../../../common';
import { OPEN_EVENT_STATUSES } from '../../../common';
import type { DocVersion } from '../domain';
import type { VersionedEvent } from '../storage/events_store';

/**
 * How an event changed in this run. `facts` is fresh values only, which never calls the agent
 * (cooldown) and is never published; `changed` is a new member, a reopening or a status change.
 */
export type EventChange = 'none' | 'facts' | 'changed';

interface Entry {
  event: EngineEvent;
  /** Absent for events created in this run. */
  version?: DocVersion;
  change: EventChange;
}

const CHANGE_RANK: Record<EventChange, number> = { none: 0, facts: 1, changed: 2 };

/** The events one run reads and changes, written back at the end with version checks. */
export interface IEventWorkingSet {
  get(eventId: string): EngineEvent | undefined;
  /** The open event that owns a series, or the most recently updated one that ever did. */
  ownerOf(fingerprint: string): EngineEvent | undefined;
  open(): EngineEvent[];
  all(): EngineEvent[];
  /** Replaces an event; the change only ever goes up within a run. */
  set(event: EngineEvent, change: EventChange): void;
  /** Adds an event created in this run. */
  add(event: EngineEvent): void;
  changeOf(eventId: string): EventChange;
  /** Everything to write back, with the version each was read at. */
  dirty(): Array<{ event: EngineEvent; version?: DocVersion; change: EventChange }>;
  /** Records the version a write returned, so a second write in the same run still applies. */
  setVersion(eventId: string, version: DocVersion): void;
  /** Forgets an event another writer changed; this run's changes to it are dropped. */
  drop(eventId: string): void;
  /** Marks everything written: later changes in the run start from `none` again. */
  clearDirty(): void;
  /**
   * Takes what the run itself wrote after a change, such as the publication result, without
   * marking it dirty: a later write in the same run must present this version, not the old one.
   */
  sync(event: EngineEvent, version: DocVersion): void;
  size(): number;
}

export function createEventWorkingSet(loaded: VersionedEvent[]): IEventWorkingSet {
  const entries = new Map<string, Entry>(
    loaded.map(({ event, version }) => [event.event_id, { event, version, change: 'none' }])
  );
  const touched = new Set<string>();
  // Series -> events that list it; lookups happen once per observation, so they must not scan.
  const byFingerprint = new Map<string, Set<string>>();
  const index = (event: EngineEvent) =>
    event.members.forEach((member) => {
      const owners = byFingerprint.get(member.fingerprint) ?? new Set<string>();
      owners.add(event.event_id);
      byFingerprint.set(member.fingerprint, owners);
    });
  const unindex = (event: EngineEvent) =>
    event.members.forEach((member) =>
      byFingerprint.get(member.fingerprint)?.delete(event.event_id)
    );
  entries.forEach((entry) => index(entry.event));

  const ownerOf = (fingerprint: string): EngineEvent | undefined =>
    [...(byFingerprint.get(fingerprint) ?? [])]
      .flatMap((eventId) => {
        const event = entries.get(eventId)?.event;
        return event ? [event] : [];
      })
      .sort((a, b) => {
        // An open owner always wins: a series belongs to one live event at a time.
        const openA = OPEN_EVENT_STATUSES.includes(a.status) ? 1 : 0;
        const openB = OPEN_EVENT_STATUSES.includes(b.status) ? 1 : 0;
        return openB - openA || b.updated_at.localeCompare(a.updated_at);
      })[0];

  return {
    get: (eventId) => entries.get(eventId)?.event,
    ownerOf,
    all: () => [...entries.values()].map((entry) => entry.event),
    open: () =>
      [...entries.values()]
        .map((entry) => entry.event)
        .filter((event) => OPEN_EVENT_STATUSES.includes(event.status)),
    set(event, change) {
      const existing = entries.get(event.event_id);
      if (existing) {
        unindex(existing.event);
      }
      index(event);
      const nextChange =
        existing && CHANGE_RANK[existing.change] > CHANGE_RANK[change] ? existing.change : change;
      entries.set(event.event_id, { event, version: existing?.version, change: nextChange });
      touched.add(event.event_id);
    },
    add(event) {
      index(event);
      entries.set(event.event_id, { event, change: 'changed' });
      touched.add(event.event_id);
    },
    changeOf: (eventId) => entries.get(eventId)?.change ?? 'none',
    dirty: () =>
      [...touched].flatMap((eventId) => {
        const entry = entries.get(eventId);
        return entry ? [{ event: entry.event, version: entry.version, change: entry.change }] : [];
      }),
    setVersion(eventId, version) {
      const entry = entries.get(eventId);
      if (entry) {
        entries.set(eventId, { ...entry, version });
      }
    },
    drop(eventId) {
      const existing = entries.get(eventId);
      if (existing) {
        unindex(existing.event);
      }
      entries.delete(eventId);
      touched.delete(eventId);
    },
    sync(event, version) {
      const existing = entries.get(event.event_id);
      if (!existing) {
        return;
      }
      unindex(existing.event);
      index(event);
      entries.set(event.event_id, { ...existing, event, version });
    },
    clearDirty() {
      touched.forEach((eventId) => {
        const entry = entries.get(eventId);
        if (entry) {
          entries.set(eventId, { ...entry, change: 'none' });
        }
      });
      touched.clear();
    },
    size: () => entries.size,
  };
}
