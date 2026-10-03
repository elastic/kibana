/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { nonEmptyStringRt, sourceLocationRt } from '../source_location_codec';
import { sha256Digest } from '../templates/template_identity';
import { findingTypeRt, type FindingType } from './classification_codec';
import { operationErrorRt } from './operation_result';
import { signalTypeRt } from './query_codec';
import { commitShaRt } from './repository_codec';

/** Review states a finding can hold; extraction only ever writes `open`. */
export const findingStatusRt = t.keyof({ invalid: null, open: null, verified: null });
export type FindingStatus = t.TypeOf<typeof findingStatusRt>;

/** The review state every new finding starts in. */
export const OPEN_FINDING_STATUS: FindingStatus = 'open';

/**
 * A source line a classifier asked a human to review. Unlike a catalog document it has a
 * review lifecycle, so `status` and `createdAt` are owned by the index after the first write.
 */
export const findingDocumentRt = t.intersection([
  t.type({
    /** The classification candidate this finding came from, for joining with workflow executions. */
    candidateId: nonEmptyStringRt,
    /** Catalog documents generated from the same candidate, so a reviewer can jump to the query. */
    catalogDocumentIds: t.readonlyArray(nonEmptyStringRt),
    /** True when the classifier also kept the candidate for the catalog. */
    cataloged: t.boolean,
    createdAt: nonEmptyStringRt,
    evidence: t.readonlyArray(sourceLocationRt),
    extractorVersion: nonEmptyStringRt,
    findingType: findingTypeRt,
    id: nonEmptyStringRt,
    repository: nonEmptyStringRt,
    revision: commitShaRt,
    signalType: signalTypeRt,
    summary: nonEmptyStringRt,
    title: nonEmptyStringRt,
    updatedAt: nonEmptyStringRt,
  }),
  t.partial({ logLevel: nonEmptyStringRt }),
]);
export type FindingDocument = t.TypeOf<typeof findingDocumentRt>;

/** Describes a finding write failure and its retry metadata. */
export const findingWriteFailureRt = t.type({
  documentId: nonEmptyStringRt,
  error: operationErrorRt,
});
export type FindingWriteFailure = t.TypeOf<typeof findingWriteFailureRt>;

/** Describes the written and failed ID collections returned by findings persistence. */
export const findingsWriteResultRt = t.type({
  failures: t.readonlyArray(findingWriteFailureRt),
  writtenIds: t.readonlyArray(nonEmptyStringRt),
});
export type FindingsWriteResult = t.TypeOf<typeof findingsWriteResultRt>;

/**
 * Derives a stable finding ID so re-extraction updates the same document instead of adding one.
 * Candidate IDs repeat across repositories (`path:line`), so the repository is part of the preimage.
 */
export const findingDocumentId = ({
  candidateId,
  findingType,
  repository,
}: {
  readonly candidateId: string;
  readonly findingType: FindingType;
  readonly repository: string;
}): string =>
  sha256Digest(
    [repository, candidateId, findingType]
      .map((component) => `${component.length}:${component}`)
      .join('|')
  );
