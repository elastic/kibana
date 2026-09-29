/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { positiveIntegerRt, repositoryRelativePathRt } from '../source_location_codec';

/** Preserves Phase 0 opaque IDs while path-based discovery migrates to location IDs. */
const legacyCandidateIdPattern: RegExp = /^[a-zA-Z0-9_.:-]+$/;

/** Returns whether a value is a Phase 0 opaque ID or a repository-relative location ID. */
const isCandidateId = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  if (legacyCandidateIdPattern.test(value)) return true;
  /** The final delimiter keeps colons in valid repository paths unambiguous. */
  const separatorIndex: number = value.lastIndexOf(':');
  if (separatorIndex <= 0) return false;
  /** The path is validated by the same policy used for source evidence. */
  const path: string = value.slice(0, separatorIndex);
  /** The suffix must be a canonical decimal, positive source line number. */
  const lineText: string = value.slice(separatorIndex + 1);
  /** Numeric form is checked against the shared positive source-line codec. */
  const line: number = Number(lineText);
  return (
    /^(?:[1-9][0-9]*)$/.test(lineText) &&
    repositoryRelativePathRt.is(path) &&
    positiveIntegerRt.is(line)
  );
};

/** Validates Phase 0 opaque IDs and path-based IDs encoded with a positive line number. */
export const candidateIdRt = new t.Type<string, string, unknown>(
  'CandidateId',
  isCandidateId,
  (value, context) =>
    isCandidateId(value)
      ? t.success(value)
      : t.failure(
          value,
          context,
          'Candidate ID must be a legacy-safe value or a repository-relative path and positive line.'
        ),
  (value) => value
);

/** Formats a classification-safe candidate ID for a repository-relative source location. */
export const candidateIdFor = (path: string, line: number): string => `${path}:${line}`;

/** Stable source-location identifier accepted by classification workflows. */
export type CandidateId = t.TypeOf<typeof candidateIdRt>;
