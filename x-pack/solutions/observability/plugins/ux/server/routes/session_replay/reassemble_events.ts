/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inflateSync } from 'zlib';

export interface ReplayEventHitSource {
  body?: string | { text?: string } | null;
  attributes?: Record<string, unknown>;
  '@timestamp'?: string;
}

interface ChunkEntry {
  total: number;
  parts: Array<string | undefined>;
  packed: boolean;
}

const getAttrNumber = (
  attrs: Record<string, unknown>,
  dotted: string,
  nestedPath: string[]
): number | undefined => {
  const flat = attrs[dotted];
  if (typeof flat === 'number') {
    return flat;
  }
  if (typeof flat === 'string' && flat !== '' && !Number.isNaN(Number(flat))) {
    return Number(flat);
  }

  let cursor: unknown = attrs;
  for (const key of nestedPath) {
    if (cursor == null || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  if (typeof cursor === 'number') {
    return cursor;
  }
  if (typeof cursor === 'string' && cursor !== '' && !Number.isNaN(Number(cursor))) {
    return Number(cursor);
  }
  return undefined;
};

const getBodyText = (body: ReplayEventHitSource['body']): string | undefined => {
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object' && typeof body.text === 'string') {
    return body.text;
  }
  return undefined;
};

/**
 * Reassemble chunked rrweb OTLP log documents into ordered event objects.
 */
export const reassembleReplayEvents = (hits: ReplayEventHitSource[]): unknown[] => {
  const chunks = new Map<number, ChunkEntry>();

  for (const hit of hits) {
    const attrs = hit.attributes ?? {};
    const eventKey = getAttrNumber(attrs, 'rr-web.event', ['rr-web', 'event']);
    if (eventKey == null) {
      continue;
    }

    const chunk = getAttrNumber(attrs, 'rr-web.chunk', ['rr-web', 'chunk']) ?? 1;
    const total = getAttrNumber(attrs, 'rr-web.total-chunks', ['rr-web', 'total-chunks']) ?? 1;
    const packed = (getAttrNumber(attrs, 'rrweb.packed', ['rrweb', 'packed']) ?? 0) === 1;
    const bodyText = getBodyText(hit.body);
    if (bodyText == null) {
      continue;
    }

    let entry = chunks.get(eventKey);
    if (!entry) {
      entry = { total, parts: [], packed };
      chunks.set(eventKey, entry);
    }
    entry.packed = entry.packed || packed;
    entry.parts[chunk - 1] = bodyText;
  }

  const events: unknown[] = [];
  const sortedKeys = [...chunks.keys()].sort((a, b) => a - b);
  for (const key of sortedKeys) {
    const entry = chunks.get(key)!;
    const filled = entry.parts.filter((part): part is string => typeof part === 'string');
    if (filled.length !== entry.total) {
      continue;
    }
    try {
      events.push(unpackReplayPayload(JSON.parse(filled.join('')), entry.packed));
    } catch {
      // skip malformed payloads
    }
  }

  return events;
};

/** Undo rrweb `@rrweb/packer` payloads (`fflate` zlib as a latin1 string). */
export const unpackReplayPayload = (parsed: unknown, packed: boolean): unknown => {
  if (!packed || typeof parsed !== 'string') {
    return parsed;
  }
  try {
    return JSON.parse(inflateSync(Buffer.from(parsed, 'latin1')).toString('utf8'));
  } catch {
    return parsed;
  }
};
