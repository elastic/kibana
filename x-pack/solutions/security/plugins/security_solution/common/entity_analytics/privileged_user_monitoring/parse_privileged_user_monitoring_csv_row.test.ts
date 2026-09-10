/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMonitoredPrivilegedUserCsvRow } from './parse_privileged_user_monitoring_csv_row';

describe('parseMonitoredPrivilegedUserCsvRow', () => {
  it('returns right with username when row has one column', () => {
    const result = parseMonitoredPrivilegedUserCsvRow(['alice']);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right).toEqual({ username: 'alice', label: undefined });
    }
  });

  it('returns left with error when row is empty', () => {
    const result = parseMonitoredPrivilegedUserCsvRow([]);
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toContain('Expected 1 or 2 columns');
    }
  });

  it('returns left with error when row has more than 2 columns', () => {
    const result = parseMonitoredPrivilegedUserCsvRow(['a', 'b', 'c']);
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toContain('Expected 1 or 2 columns');
    }
  });

  it('returns left with error when username is missing', () => {
    const result = parseMonitoredPrivilegedUserCsvRow(['']);
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBe('Missing user name');
    }
  });

  it('returns right with username and label when row has two columns and username is present', () => {
    const result = parseMonitoredPrivilegedUserCsvRow(['bob', 'extra']);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right).toEqual({ username: 'bob', label: 'extra' });
    }
  });

  it('returns left with error when row has two columns and username is empty', () => {
    const result = parseMonitoredPrivilegedUserCsvRow(['', 'extra']);
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBe('Missing user name');
    }
  });
});
