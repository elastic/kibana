/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasNullCharacter, trimInputValues } from '.';

describe('hasNullCharacter', () => {
  it.each([
    ['interior NUL', 'value\u0000with-nul'],
    ['leading NUL', '\u0000value'],
    ['trailing NUL', 'value\u0000'],
  ])('detects a %s', (_, value) => {
    expect(hasNullCharacter(value)).toBe(true);
  });

  it('detects a NUL surrounded by edge whitespace', () => {
    expect(hasNullCharacter(' value\u0000 ')).toBe(true);
  });

  // Deliberately allowed: a real process.command_line or a Linux file name can contain these,
  // and the Endpoint matches values literally, so rejecting them would break valid entries.
  it.each([
    ['interior tab', 'powershell.exe\t-Command'],
    ['interior line feed', 'powershell.exe\n-Command'],
    ['interior carriage return', 'value\rmore'],
    ['interior DEL', 'value\u007Fmore'],
    ['interior C1', 'value\u0085more'],
    ['interior vertical tab', 'value\u000Bmore'],
  ])('allows an %s', (_, value) => {
    expect(hasNullCharacter(value)).toBe(false);
  });

  it('inspects every array member', () => {
    expect(hasNullCharacter([' whitespace ', 'ctl\u0000'])).toBe(true);
    expect(hasNullCharacter(['clean', 'also clean', 'bad\u0000value'])).toBe(true);
    expect(hasNullCharacter(['clean', 'also clean'])).toBe(false);
  });

  it.each([
    ['empty value', ''],
    ['absent value', undefined],
    ['empty array', []],
    ['Windows path', 'C:\\Program Files\\Elastic\\endpoint.exe'],
    ['Unix path', '/opt/Elastic Endpoint/endpoint'],
    ['hash', 'a'.repeat(64)],
    ['ordinary interior spaces', 'Elastic Endpoint'],
    ['leading and trailing space', ' value '],
    ['edge tab', '\tvalue\t'],
    ['edge line feed', '\nvalue\n'],
    ['edge non-breaking space', '\u00A0value\u00A0'],
    ['edge byte order mark', '\uFEFFvalue\uFEFF'],
    ['array of edge-whitespace members', ['clean', ' trailing ']],
  ])('returns false for a clean %s', (_, value) => {
    expect(hasNullCharacter(value)).toBe(false);
  });
});

describe('trimInputValues', () => {
  it('trims a string', () => {
    expect(trimInputValues('  /opt/app  ')).toBe('/opt/app');
  });

  it('trims array members and drops empties', () => {
    expect(trimInputValues(['  one  ', '\ttwo', '   ', 'three'])).toEqual(['one', 'two', 'three']);
  });
});
