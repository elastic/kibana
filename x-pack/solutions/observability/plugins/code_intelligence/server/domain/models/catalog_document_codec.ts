/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { nonEmptyStringRt, sourceLocationRt } from '../source_location_codec';
import { severityScoreRt } from './classification_codec';
import { queryParameterRt, queryTemplateInvariantError, signalTypeRt } from './query_codec';
import { commitShaRt } from './repository_codec';
import { operationErrorRt } from './operation_result';

/** Accepts the explicit algorithm-tagged full SHA-256 drift hash persisted with every catalog document. */
export const sourceHashRt = t.refinement(
  nonEmptyStringRt,
  (value) => /^sha256:[a-f0-9]{64}$/.test(value),
  'SourceHash'
);

/** A parameterized catalog record. Validation is carried separately by the write request. */
const catalogDocumentBaseRt = t.intersection([
  t.type({
    createdAt: nonEmptyStringRt,
    description: nonEmptyStringRt,
    evidence: t.readonlyArray(sourceLocationRt),
    extractorVersion: nonEmptyStringRt,
    id: nonEmptyStringRt,
    parameters: t.record(t.string, queryParameterRt),
    repository: nonEmptyStringRt,
    revision: commitShaRt,
    signalType: signalTypeRt,
    sourceHash: sourceHashRt,
    templatedQuery: nonEmptyStringRt,
    title: nonEmptyStringRt,
    updatedAt: nonEmptyStringRt,
  }),
  t.partial({ logLevel: nonEmptyStringRt, severityScore: severityScoreRt }),
]);

/** Validates catalog records, including their query-template invariants. */
export const catalogDocumentRt = new t.Type<
  t.TypeOf<typeof catalogDocumentBaseRt>,
  unknown,
  unknown
>(
  'CatalogDocument',
  // Shape validation is separate from the template invariant so invalid queries cannot be stored.
  (value): value is t.TypeOf<typeof catalogDocumentBaseRt> =>
    catalogDocumentBaseRt.is(value) &&
    queryTemplateInvariantError({ parameters: value.parameters, query: value.templatedQuery }) ===
      undefined,
  (value, context) => {
    /** Holds validated external data for the following invariant checks. */
    const decoded = catalogDocumentBaseRt.validate(value, context);
    if (decoded._tag === 'Left') return decoded;
    /** Holds the invariant or codec error returned to the caller. */
    const error = queryTemplateInvariantError({
      parameters: decoded.right.parameters,
      query: decoded.right.templatedQuery,
    });
    return error === undefined ? decoded : t.failure(value, context, error);
  },
  (value) => value
);
export type CatalogDocument = t.TypeOf<typeof catalogDocumentRt>;

/** Restricts persisted validation outcomes to valid or explicitly skipped queries. */
const persistableValidationRt = t.union([
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('valid') }),
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('skipped') }),
]);

/** Makes persistable validation state auditable without storing invalid query diagnostics. */
export const catalogWriteRequestRt = t.type({
  document: catalogDocumentRt,
  validation: persistableValidationRt,
});
export type CatalogWriteRequest = t.TypeOf<typeof catalogWriteRequestRt>;

/** Describes a document write failure and its retry metadata. */
export const catalogWriteFailureRt = t.type({
  documentId: nonEmptyStringRt,
  error: operationErrorRt,
});
export type CatalogWriteFailure = t.TypeOf<typeof catalogWriteFailureRt>;

/** Describes the written and failed ID collections returned by persistence. */
const catalogWriteResultBaseRt = t.type({
  failures: t.readonlyArray(catalogWriteFailureRt),
  writtenIds: t.readonlyArray(nonEmptyStringRt),
});

/** Detects duplicate or overlapping persistence outcomes. */
const catalogWriteResultError = (
  result: t.TypeOf<typeof catalogWriteResultBaseRt>
): string | undefined => {
  /** Collects failed IDs for uniqueness and disjointness checks. */
  const failedIds = result.failures.map(({ documentId }) => documentId);
  // Written and failed IDs form a disjoint partition so retries have one authoritative outcome.
  if (new Set(result.writtenIds).size !== result.writtenIds.length)
    return 'Written document IDs must be unique.';
  if (new Set(failedIds).size !== failedIds.length) return 'Failed document IDs must be unique.';
  return failedIds.some((documentId) => result.writtenIds.includes(documentId))
    ? 'A document cannot be both written and failed.'
    : undefined;
};

/** Validates that write outcomes are unique and mutually exclusive. */
export const catalogWriteResultRt = new t.Type<
  t.TypeOf<typeof catalogWriteResultBaseRt>,
  unknown,
  unknown
>(
  'CatalogWriteResult',
  (value): value is t.TypeOf<typeof catalogWriteResultBaseRt> =>
    catalogWriteResultBaseRt.is(value) && catalogWriteResultError(value) === undefined,
  (value, context) => {
    /** Holds validated external data for the following invariant checks. */
    const decoded = catalogWriteResultBaseRt.validate(value, context);
    if (decoded._tag === 'Left') return decoded;
    /** Holds the invariant or codec error returned to the caller. */
    const error = catalogWriteResultError(decoded.right);
    return error === undefined ? decoded : t.failure(value, context, error);
  },
  (value) => value
);
export type CatalogWriteResult = t.TypeOf<typeof catalogWriteResultRt>;
