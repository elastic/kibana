/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInputValueCharacterIssue, InputValueCharacterIssue } from '.';

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

  it.each([
    ['space', ' value '],
    ['tab', '\tvalue\t'],
    ['line feed', '\nvalue\n'],
    ['non-breaking space', '\u00A0value\u00A0'],
    ['byte order mark', '\uFEFFvalue\uFEFF'],
  ])('classifies edge %s as repairable whitespace', (_, value) => {
    expect(getInputValueCharacterIssue(value)).toBe(InputValueCharacterIssue.EDGE_WHITESPACE);
  });

  it('classifies an edge-only tab as whitespace and an interior tab as a control', () => {
    expect(getInputValueCharacterIssue('\tvalue')).toBe(InputValueCharacterIssue.EDGE_WHITESPACE);
    expect(getInputValueCharacterIssue('value\tvalue')).toBe(
      InputValueCharacterIssue.CONTROL_CHARACTER
    );
  });

  it('gives a remaining control character precedence over edge whitespace', () => {
    expect(getInputValueCharacterIssue(' value\u0000 ')).toBe(
      InputValueCharacterIssue.CONTROL_CHARACTER
    );
  });

  it('inspects every array member', () => {
    expect(getInputValueCharacterIssue(['clean', 'also clean', 'bad\u007Fvalue'])).toBe(
      InputValueCharacterIssue.CONTROL_CHARACTER
    );
    expect(getInputValueCharacterIssue(['clean', ' trailing '])).toBe(
      InputValueCharacterIssue.EDGE_WHITESPACE
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
  ])('returns no issue for a clean %s', (_, value) => {
    expect(getInputValueCharacterIssue(value)).toBeUndefined();
  });
});
