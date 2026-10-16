/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsePemCertificateEntries } from './parse_pem_certificate_entries';

const pem = (body: string) => `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;

describe('parsePemCertificateEntries', () => {
  it('returns an empty array for blank input', () => {
    expect(parsePemCertificateEntries('')).toEqual([]);
    expect(parsePemCertificateEntries('   \n\n  ')).toEqual([]);
  });

  it('drops text that is not a PEM block', () => {
    expect(parsePemCertificateEntries('not a certificate')).toEqual([]);
  });

  it('drops leading text before the first BEGIN CERTIFICATE marker', () => {
    expect(parsePemCertificateEntries(`notes\n${pem('AAA')}`)).toEqual([pem('AAA')]);
  });

  it('parses a single PEM block', () => {
    expect(parsePemCertificateEntries(pem('AAA'))).toEqual([pem('AAA')]);
  });

  it('parses multiple PEM blocks', () => {
    expect(parsePemCertificateEntries(`${pem('AAA')}\n\n${pem('BBB')}`)).toEqual([
      pem('AAA'),
      pem('BBB'),
    ]);
  });

  it('trims surrounding whitespace on each block', () => {
    expect(parsePemCertificateEntries(`  ${pem('AAA')}  \n\n  ${pem('BBB')}  `)).toEqual([
      pem('AAA'),
      pem('BBB'),
    ]);
  });
});
