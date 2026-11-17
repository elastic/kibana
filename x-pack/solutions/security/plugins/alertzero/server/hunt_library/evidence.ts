/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  HUNT_SESSION_MAX_FIELDS_PER_ROW,
  HUNT_SESSION_MAX_ROWS_PER_PRESERVATION,
} from '../../common/hunt_session_attachment_schema';
import type { HuntDefinition } from './hunt_definition';

export type EvidenceScalar = string | number | boolean | null;
export type EvidenceRow = Record<string, EvidenceScalar>;

/** What an analyst selected in Discover. A raw event is a reference; an aggregate row is its values. */
export type EvidenceSelection =
  | { kind: 'raw_event'; index: string; id: string }
  | { kind: 'aggregate'; values: Record<string, EvidenceScalar> };

export interface PreservationContext {
  query: string;
  filters: Array<Record<string, EvidenceScalar>>;
  timeRange: { from: string; to: string };
  dataViewId: string;
}

export interface PreparedEvidence {
  fingerprints: string[];
  rows: EvidenceRow[];
}

export type EvidenceRejectionReason =
  | 'no_rows'
  | 'too_many_rows'
  | 'wrong_result_kind'
  | 'document_unavailable';

/** The selection cannot be preserved; nothing was written. */
export class HuntEvidenceRejectedError extends Error {
  constructor(public readonly reason: EvidenceRejectionReason, message: string) {
    super(message);
    this.name = 'HuntEvidenceRejectedError';
  }
}

/** Marks a stored aggregate row: it is what the analyst saw, not a document that can be re-read. */
export const AGGREGATE_EVIDENCE_LABEL = 'analyst_supplied_aggregate';

const MAX_STRING_LENGTH = 1024;
const SECRET_FIELD_PATTERN =
  /(passw(or)?d|secret|token|credential|api[_-]?key|authorization|cookie|private[_-]?key|request[_.]?(body|parameters))/i;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Canonical JSON: object keys sorted, no extra whitespace. */
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`
      )
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

/** Identifies the query state aggregate rows were produced under, so a changed window keeps its own provenance. */
export const hashPreservationContext = (context: PreservationContext): string =>
  sha256(canonicalJson(context));

const flatten = (value: unknown, prefix = '', out: Record<string, unknown> = {}) => {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else if (prefix) {
    out[prefix] = value;
  }
  return out;
};

const toScalar = (value: unknown): EvidenceScalar | undefined => {
  if (value === null) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
  if (value === undefined) return undefined;
  return JSON.stringify(value).slice(0, MAX_STRING_LENGTH);
};

/**
 * Keeps scalar values, drops credential-like and secret-like fields, truncates long strings and caps
 * the field count. Only fields the caller already allowlisted reach here; this is the last filter.
 */
export const sanitizeEvidenceFields = (
  fields: Record<string, unknown>,
  maxFields = HUNT_SESSION_MAX_FIELDS_PER_ROW
): EvidenceRow => {
  const row: EvidenceRow = {};
  for (const [name, value] of Object.entries(fields)) {
    if (Object.keys(row).length >= maxFields) break;
    if (SECRET_FIELD_PATTERN.test(name)) continue;
    const scalar = toScalar(value);
    if (scalar !== undefined) row[name.slice(0, 256)] = scalar;
  }
  return row;
};

const rawFingerprint = (index: string, id: string) => sha256(`raw|${index}|${id}`);

const aggregateFingerprint = ({
  definition,
  sessionId,
  contextHash,
  row,
}: {
  definition: Pick<HuntDefinition, 'id' | 'version' | 'query'>;
  sessionId: string;
  contextHash: string;
  row: EvidenceRow;
}) =>
  sha256(
    [
      'aggregate',
      definition.id,
      definition.version,
      definition.query.id,
      sessionId,
      contextHash,
      canonicalJson(row),
    ].join('|')
  );

/**
 * Turns the analyst's selection into the evidence to store. A raw event is re-read by index and id
 * under the analyst's own Elasticsearch permissions, and only the definition's evidence fields are
 * kept, so a forged, deleted or inaccessible reference rejects the whole request. An aggregate row
 * cannot be re-read; it is stored as supplied, labelled as such, with the context it came from.
 */
export const prepareEvidence = async ({
  esClient,
  definition,
  sessionId,
  context,
  selection,
}: {
  esClient: ElasticsearchClient;
  definition: HuntDefinition;
  sessionId: string;
  context: PreservationContext;
  selection: EvidenceSelection[];
}): Promise<PreparedEvidence> => {
  if (selection.length === 0) {
    throw new HuntEvidenceRejectedError('no_rows', 'Select at least one row to preserve.');
  }
  if (selection.length > HUNT_SESSION_MAX_ROWS_PER_PRESERVATION) {
    throw new HuntEvidenceRejectedError(
      'too_many_rows',
      `Select at most ${HUNT_SESSION_MAX_ROWS_PER_PRESERVATION} rows to preserve at once.`
    );
  }

  const { resultKind } = definition.query;
  if (selection.some(({ kind }) => kind !== resultKind)) {
    throw new HuntEvidenceRejectedError(
      'wrong_result_kind',
      `This hunt returns ${resultKind === 'raw_event' ? 'events' : 'aggregate rows'}.`
    );
  }

  if (resultKind === 'aggregate') {
    const contextHash = hashPreservationContext(context);
    const rows = (selection as Array<Extract<EvidenceSelection, { kind: 'aggregate' }>>).map(
      ({ values }) => ({
        ...sanitizeEvidenceFields(values, HUNT_SESSION_MAX_FIELDS_PER_ROW - 1),
        evidenceKind: AGGREGATE_EVIDENCE_LABEL,
      })
    );
    return {
      rows,
      fingerprints: rows.map((row) =>
        aggregateFingerprint({ definition, sessionId, contextHash, row })
      ),
    };
  }

  const refs = selection as Array<Extract<EvidenceSelection, { kind: 'raw_event' }>>;
  const { docs } = await esClient.mget<Record<string, unknown>>({
    docs: refs.map(({ index, id }) => ({
      _index: index,
      _id: id,
      _source: definition.query.evidenceFields,
    })),
  });

  const rows = docs.map((doc, position) => {
    if (!('found' in doc) || !doc.found) {
      throw new HuntEvidenceRejectedError(
        'document_unavailable',
        'A selected document is missing or you cannot read it.'
      );
    }
    const { index, id } = refs[position];
    return {
      _index: index,
      _id: id,
      ...sanitizeEvidenceFields(flatten(doc._source), HUNT_SESSION_MAX_FIELDS_PER_ROW - 2),
    };
  });

  return { rows, fingerprints: refs.map(({ index, id }) => rawFingerprint(index, id)) };
};
