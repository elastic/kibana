/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOutputRedactor, redactDeep, REDACTED_PLACEHOLDER } from './output_redactor';

const SECRET = 'ghp_S3cr3t+Value/42';

describe('createOutputRedactor', () => {
  it('redacts every occurrence of a secret', () => {
    const { redact } = createOutputRedactor([SECRET]);

    expect(redact(`token=${SECRET} again ${SECRET}`)).toBe(
      `token=${REDACTED_PLACEHOLDER} again ${REDACTED_PLACEHOLDER}`
    );
    expect(redact('nothing to see here')).toBe('nothing to see here');
  });

  it('redacts a secret containing another secret as a whole', () => {
    const { redact } = createOutputRedactor(['secret', `${SECRET}-secret`]);

    expect(redact(`x ${SECRET}-secret y`)).toBe(`x ${REDACTED_PLACEHOLDER} y`);
  });

  it('fully redacts partially overlapping secrets', () => {
    const { redact } = createOutputRedactor(['abcdefgh', 'efghijkl']);

    expect(redact('x abcdefghijkl y')).toBe(`x ${REDACTED_PLACEHOLDER} y`);
  });

  it('redacts adjacent secrets and many secrets in one text', () => {
    const secrets = Array.from({ length: 100 }, (_, i) => `secret-value-${i}-end`);
    const { redact } = createOutputRedactor(secrets);

    expect(redact(`${secrets[3]}${secrets[4]}`)).toBe(
      `${REDACTED_PLACEHOLDER}${REDACTED_PLACEHOLDER}`
    );
    expect(redact(secrets.map((secret) => `<${secret}>`).join(' '))).toBe(
      secrets.map(() => `<${REDACTED_PLACEHOLDER}>`).join(' ')
    );
  });

  it('fully redacts overlapping occurrences of the same secret', () => {
    const { redact } = createOutputRedactor(['aaaaaaaa']);

    expect(redact('a'.repeat(15))).toBe(REDACTED_PLACEHOLDER);
    expect(redact(`x ${'a'.repeat(15)} y`)).toBe(`x ${REDACTED_PLACEHOLDER} y`);
  });

  it('fully redacts overlapping repeats of a periodic secret', () => {
    const { redact } = createOutputRedactor(['abcabcab']);

    expect(redact('x abcabcabcab y')).toBe(`x ${REDACTED_PLACEHOLDER} y`);
  });

  it('fully redacts overlaps that are not a multiple of the smallest period', () => {
    // 'aabaabaa' has smallest period 3, but can also recur 7 characters later, sharing one 'a'.
    const { redact } = createOutputRedactor(['aabaabaa']);

    expect(redact('x aabaabaaabaabaa y')).toBe(`x ${REDACTED_PLACEHOLDER} y`);
    expect(redact('x aabaaaabaabaa y')).toBe(`x aabaa${REDACTED_PLACEHOLDER} y`);
  });

  it('matches a reference that checks every offset for random repetitive input', () => {
    // Reference: every occurrence at every offset, overlapping spans merged.
    const referenceRedact = (secrets: string[], text: string): string => {
      const spans: Array<[number, number]> = [];
      for (const secret of secrets) {
        for (let i = text.indexOf(secret); i !== -1; i = text.indexOf(secret, i + 1)) {
          spans.push([i, i + secret.length]);
        }
      }
      spans.sort(([a], [b]) => a - b);
      const merged: Array<[number, number]> = [];
      for (const [start, end] of spans) {
        const last = merged[merged.length - 1];
        if (last && start < last[1]) {
          last[1] = Math.max(last[1], end);
        } else {
          merged.push([start, end]);
        }
      }
      let result = '';
      let copiedUpTo = 0;
      for (const [start, end] of merged) {
        result += text.slice(copiedUpTo, start) + REDACTED_PLACEHOLDER;
        copiedUpTo = end;
      }
      return result + text.slice(copiedUpTo);
    };

    // Deterministic pseudo-random generator so failures are reproducible.
    let seed = 42;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const randomString = (length: number) =>
      Array.from({ length }, () => (random() < 0.7 ? 'a' : 'b')).join('');

    for (let run = 0; run < 500; run++) {
      const secrets = Array.from({ length: 1 + Math.floor(random() * 3) }, () =>
        randomString(6 + Math.floor(random() * 6))
      );
      const text = randomString(Math.floor(random() * 80));

      expect(createOutputRedactor(secrets).redact(text)).toBe(referenceRedact(secrets, text));
    }
  });

  it('stays fast on long repetitive output that overlaps a long secret everywhere', () => {
    const { redact } = createOutputRedactor(['a'.repeat(16384)]);
    const text = `${'a'.repeat(2_000_000)}b${'a'.repeat(2_000_000)}`;

    const startedAt = Date.now();
    expect(redact(text)).toBe(`${REDACTED_PLACEHOLDER}b${REDACTED_PLACEHOLDER}`);
    expect(Date.now() - startedAt).toBeLessThan(2000);
  });

  it('ignores values too short to redact without mangling unrelated text', () => {
    expect(createOutputRedactor(['abc']).redact('abc abcabc')).toBe('abc abcabc');
  });
});

describe('redactDeep', () => {
  it('redacts every string nested in objects and arrays and keeps other values', () => {
    const redactor = createOutputRedactor([SECRET]);

    expect(
      redactDeep({ stdout: SECRET, nested: [{ message: `x ${SECRET}` }, 42, null, true] }, redactor)
    ).toEqual({
      stdout: REDACTED_PLACEHOLDER,
      nested: [{ message: `x ${REDACTED_PLACEHOLDER}` }, 42, null, true],
    });
  });
});
