/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { MemoryNote, MemoryNoteKind, MemoryScope } from '../../../common';
import type { IStateStore } from '../storage/state_store';

/** Notes kept per series, KI or service; older ones fall off, newest first. */
const MAX_NOTES_PER_KEY = 10;
/** Notes one case shows the agent; enough to remember, small enough to bound tokens. */
const MAX_NOTES_PER_CASE = 8;

/** The memory one signal's case reads: its series, its KI on any service, its service. */
export interface MemoryKeys {
  fingerprints: string[];
  services: string[];
}

/** A note to add, before it gets its id and time. */
export interface NewMemoryNote {
  scope: MemoryScope;
  key: string;
  kind: MemoryNoteKind;
  text: string;
  evidence: string;
}

/** Memory the agent reads. Notes only inform the AI; code never decides on them. */
export interface IMemory {
  /**
   * Adds notes, skipping any whose text and evidence are already stored for the same key, so a
   * learning pass can run twice without writing a second copy.
   */
  add(notes: NewMemoryNote[]): Promise<number>;
  /** Active notes for a case, newest first, prefixed with what they are about. */
  recall(keys: MemoryKeys): Promise<string[]>;
  /** Every note, active or retired, newest first. */
  list(): Promise<MemoryNote[]>;
  /** Retires a note: it stays for the record and is no longer shown to the agent. */
  retire(params: { noteId: string; reason: string }): Promise<MemoryNote | undefined>;
}

const docKey = (scope: MemoryScope, key: string) => `${scope}:${key}`;

const noteId = (note: NewMemoryNote) =>
  createHash('sha256')
    .update(`${note.scope}|${note.key}|${note.text}|${note.evidence}`)
    .digest('hex')
    .slice(0, 16);

/** The KI a series counts, read from its fingerprint (`ki:<source>:<ki>:<service>`). */
export function kiIdOf(fingerprint: string): string | undefined {
  const parts = fingerprint.split(':');
  return parts[0] === 'ki' && parts.length >= 4 ? parts[2] : undefined;
}

/** Memory of one space, kept in its state index. */
export function createMemory(state: IStateStore): IMemory {
  const keysOf = ({ fingerprints, services }: MemoryKeys) => [
    ...fingerprints.map((fingerprint) => docKey('series', fingerprint)),
    ...fingerprints.flatMap((fingerprint) => {
      const kiId = kiIdOf(fingerprint);
      return kiId ? [docKey('ki', kiId)] : [];
    }),
    ...services.map((service) => docKey('service', service)),
  ];

  return {
    async add(notes) {
      if (notes.length === 0) {
        return 0;
      }
      const grouped = notes.reduce((groups, note) => {
        const key = docKey(note.scope, note.key);
        groups.set(key, [...(groups.get(key) ?? []), note]);
        return groups;
      }, new Map<string, NewMemoryNote[]>());
      const existing = await state.getMany('memory_notes', [...grouped.keys()]);
      const now = new Date().toISOString();
      const written = await Promise.all(
        [...grouped.entries()].map(async ([key, additions]) => {
          const current = existing.get(key)?.notes ?? [];
          const known = new Set(current.map((note) => note.note_id));
          const fresh = additions
            .map((note): MemoryNote => ({ ...note, note_id: noteId(note), at: now }))
            .filter((note) => !known.has(note.note_id));
          if (fresh.length === 0) {
            return 0;
          }
          const [first] = additions;
          await state.put(
            'memory_notes',
            {
              scope: first.scope,
              key: first.key,
              notes: [...fresh, ...current].slice(0, MAX_NOTES_PER_KEY),
            },
            { key }
          );
          return fresh.length;
        })
      );
      return written.reduce((sum, count) => sum + count, 0);
    },

    async recall(keys) {
      const found = await state.getMany('memory_notes', keysOf(keys));
      return [...found.values()]
        .flatMap((doc) => doc.notes.filter((note) => !note.retired_at))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, MAX_NOTES_PER_CASE)
        .map((note) => `[${note.scope} ${note.key}, ${note.kind}] ${note.text}`);
    },

    async list() {
      const docs = await state.list('memory_notes');
      return docs.flatMap((doc) => doc.notes).sort((a, b) => b.at.localeCompare(a.at));
    },

    async retire({ noteId: id, reason }) {
      const docs = await state.list('memory_notes');
      const doc = docs.find((item) => item.notes.some((note) => note.note_id === id));
      if (!doc) {
        return undefined;
      }
      const retiredAt = new Date().toISOString();
      const notes = doc.notes.map((note) =>
        note.note_id === id ? { ...note, retired_at: retiredAt, retired_reason: reason } : note
      );
      await state.put('memory_notes', { ...doc, notes }, { key: docKey(doc.scope, doc.key) });
      return notes.find((note) => note.note_id === id);
    },
  };
}
