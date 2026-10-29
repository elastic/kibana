/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validationError } from '../errors';

export interface SequenceNumbers {
  seqNo: number;
  primaryTerm: number;
}

/** Encodes `_seq_no` and `_primary_term` into the opaque `version` that the API exposes. */
export const encodeVersion = ({ seqNo, primaryTerm }: SequenceNumbers): string =>
  Buffer.from(JSON.stringify([seqNo, primaryTerm]), 'utf8').toString('base64');

export const decodeVersion = (version: string): SequenceNumbers => {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(version, 'base64').toString('utf8'));
    if (
      Array.isArray(decoded) &&
      decoded.length === 2 &&
      decoded.every((part) => Number.isSafeInteger(part) && part >= 0)
    ) {
      const [seqNo, primaryTerm] = decoded;
      return { seqNo, primaryTerm };
    }
  } catch {
    // Reported below.
  }
  throw validationError(`Invalid version "${version}".`);
};
