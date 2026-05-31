/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIntent } from '../intent_parser';

describe('parseIntent', () => {
  it('parses isolate intent with hostname', () => {
    const result = parseIntent('Isolate host WIN-PROD-042');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('isolate');
    expect(result!.hostName).toBe('WIN-PROD-042');
  });

  it('parses isolate intent without "host" keyword', () => {
    const result = parseIntent('Isolate WIN-PROD-042');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('isolate');
    expect(result!.hostName).toBe('WIN-PROD-042');
  });

  it('parses isolate intent with backticks', () => {
    const result = parseIntent('Isolate `WEB-01`');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('isolate');
    expect(result!.hostName).toBe('WEB-01');
  });

  it('parses quarantine synonym', () => {
    const result = parseIntent('Quarantine host INFECTED-01');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('isolate');
    expect(result!.hostName).toBe('INFECTED-01');
  });

  it('parses unisolate intent', () => {
    const result = parseIntent('Unisolate WIN-PROD-042');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('unisolate');
    expect(result!.hostName).toBe('WIN-PROD-042');
  });

  it('parses release synonym', () => {
    const result = parseIntent('Release host WIN-PROD-042');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('unisolate');
    expect(result!.hostName).toBe('WIN-PROD-042');
  });

  it('parses reconnect synonym', () => {
    const result = parseIntent('Reconnect LAPTOP-07');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('unisolate');
    expect(result!.hostName).toBe('LAPTOP-07');
  });

  it('returns null for unrelated messages', () => {
    const result = parseIntent('Show me the alerts for today');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseIntent('');
    expect(result).toBeNull();
  });

  it('is case-insensitive', () => {
    const result = parseIntent('ISOLATE host SERVER-01');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('isolate');
    expect(result!.hostName).toBe('SERVER-01');
  });
});
