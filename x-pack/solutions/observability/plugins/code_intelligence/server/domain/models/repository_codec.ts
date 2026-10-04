/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { nonEmptyStringRt } from '../source_location_codec';

/** Validates immutable 40- or 64-character hexadecimal revisions. */
export const commitShaRt = t.refinement(
  t.string,
  (value) => /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value),
  'CommitSha'
);

/** A customer-selected repository and revision before acquisition. */
export const repositoryRevisionRequestRt = t.type({
  repository: nonEmptyStringRt,
  revision: nonEmptyStringRt,
});

export type RepositoryRevisionRequest = t.TypeOf<typeof repositoryRevisionRequestRt>;

/** A repository request resolved once to the immutable commit used by all reads. */
export const resolvedRepositoryRt = t.type({
  commitSha: commitShaRt,
  repository: nonEmptyStringRt,
  requestedRevision: nonEmptyStringRt,
});

export type ResolvedRepository = t.TypeOf<typeof resolvedRepositoryRt>;
