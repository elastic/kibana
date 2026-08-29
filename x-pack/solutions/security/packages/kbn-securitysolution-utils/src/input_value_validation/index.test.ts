/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInputValueCharacterIssue,
  InputValueCharacterIssue,
  trimInputValue,
  trimInputValues,
} from '.';

describe('getInputValueCharacterIssue', () => {
  it.each([
    ['tab', 'value\twith-tab'],
    ['line feed', 'value\nwith-line-feed'],
    ['carriage return', 'value\rwith-carriage-return'],
    ['NUL', 'value\u0000with-nul'],
    ['DEL', 'value\u007Fwith-del'],
    ['C1', 'value\u0085with-c1'],
  ])('classifies an interior %s as a control character', (_, value) => {
    expect(getInputValueCharacterIssue(value)).toBe(InputValueCharacterIssue.CONTROL_CHARACTER);
  });

  it('gives a remaining control character precedence over edge whitespace', () => {
    expect(getInputValueCharacterIssue(' value\u0000 ')).toBe(
      InputValueCharacterIssue.CONTROL_CHARACTER
    );
  });

  it('inspects every array member and prefers a control character', () => {
    expect(getInputValueCharacterIssue([' whitespace ', 'ctl\u0000'])).toBe(
      InputValueCharacterIssue.CONTROL_CHARACTER
    );
    expect(getInputValueCharacterIssue(['clean', 'also clean', 'bad\u007Fvalue'])).toBe(
      InputValueCharacterIssue.CONTROL_CHARACTER
    );
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
  ])('returns no issue for a clean %s', (_, value) => {
    expect(getInputValueCharacterIssue(value)).toBeUndefined();
  });
});

describe('trimInputValues', () => {
  it('trims a string', () => {
    expect(trimInputValue('  /opt/app  ')).toBe('/opt/app');
  });

  it('trims array members and drops empties', () => {
    expect(trimInputValues(['  one  ', '\ttwo', '   ', 'three'])).toEqual(['one', 'two', 'three']);
  });
});
