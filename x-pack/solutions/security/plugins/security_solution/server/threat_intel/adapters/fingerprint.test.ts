/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { buildFingerprint } from './fingerprint';

describe('buildFingerprint', () => {
  it('length-prefixes each part so the seed is unambiguous', () => {
    const expected = createHash('sha256')
      .update('28:https://example.com/feed.xml7:item-425:Title')
      .digest('hex');
    expect(buildFingerprint(['https://example.com/feed.xml', 'item-42', 'Title'])).toBe(expected);
  });

  // A plain join on `:` collided across part boundaries, so two different feed
  // items produced one fingerprint and the second was deduplicated away as
  // already-ingested. Titles, URLs, and ids routinely contain colons.
  it('does not collide when a colon moves across a part boundary', () => {
    expect(buildFingerprint(['a:b', 'c'])).not.toBe(buildFingerprint(['a', 'b:c']));
  });

  it('does not collide when a part boundary shifts', () => {
    expect(buildFingerprint(['https://evil.test', 'a'])).not.toBe(
      buildFingerprint(['https://evil.test:a', ''])
    );
  });

  it('returns a 64-char hex digest', () => {
    expect(buildFingerprint(['a', 'b'])).toMatch(/^[0-9a-f]{64}$/);
  });

  it('NFKC-normalizes parts so unicode equivalents collapse', () => {
    // U+FB01 (ﬁ ligature) vs ASCII "fi".
    expect(buildFingerprint(['url', 'id', '\ufb01nal'])).toBe(
      buildFingerprint(['url', 'id', 'final'])
    );
  });

  it('trims leading/trailing whitespace per part', () => {
    expect(buildFingerprint(['  url  ', '  id  '])).toBe(buildFingerprint(['url', 'id']));
  });

  it('treats undefined/null parts as empty strings (still positional)', () => {
    const a = buildFingerprint([undefined, undefined, 'id']);
    const b = buildFingerprint([undefined, undefined, 'id']);
    expect(a).toBe(b);
    // A missing part is positionally distinct from the part moving up.
    expect(a).not.toBe(buildFingerprint(['id']));
  });

  it('produces a stable digest for the same logical input', () => {
    const fp1 = buildFingerprint(['https://example.com', 'id-1', 'modified-2026-05-01']);
    const fp2 = buildFingerprint(['https://example.com', 'id-1', 'modified-2026-05-01']);
    expect(fp1).toBe(fp2);
  });

  it('produces different digests when the version stamp changes', () => {
    const a = buildFingerprint(['https://example.com', 'id-1', '2026-05-01']);
    const b = buildFingerprint(['https://example.com', 'id-1', '2026-05-02']);
    expect(a).not.toBe(b);
  });
});
