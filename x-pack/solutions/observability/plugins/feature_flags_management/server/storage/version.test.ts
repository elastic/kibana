/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureFlagsError } from '../errors';
import { decodeVersion, encodeVersion } from './version';

describe('version', () => {
  it('round-trips sequence numbers', () => {
    expect(decodeVersion(encodeVersion({ seqNo: 12, primaryTerm: 3 }))).toEqual({
      seqNo: 12,
      primaryTerm: 3,
    });
  });

  it.each([
    'not base64!',
    Buffer.from('{}').toString('base64'),
    Buffer.from('[1]').toString('base64'),
    Buffer.from('[-1, 1]').toString('base64'),
    Buffer.from('[1.5, 1]').toString('base64'),
  ])('rejects %s with a 400', (version) => {
    expect(() => decodeVersion(version)).toThrow(FeatureFlagsError);
    expect(() => decodeVersion(version)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});
