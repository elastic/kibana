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
