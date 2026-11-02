/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAlertCsv, alertHasValue } from './alert_csv';
import { renderAlert } from './render_alert';
import type { AuditAlert } from './types';

const alert: AuditAlert = {
  id: 'abc123',
  fields: {
    'user.name': 'alice',
    'user.id': 'arn:aws:iam::111:user/alice',
    'cloud.account.id': '111',
    'source.ip': '203.0.113.50',
    'source.as.number': 64500,
    'user_agent.original': 'aws-cli/2.15.0',
    'host.name': 'web-1',
  },
};

describe('renderAlert', () => {
  it('renders the product field,value format with sorted keys and the _id', () => {
    const { pageContent } = renderAlert(alert, 'baseline');
    expect(pageContent.split('\n')).toEqual([
      '_id,abc123',
      'host.name,web-1',
      'source.ip,203.0.113.50',
      'user.name,alice',
    ]);
  });

  it('omits enriched-only fields from the baseline', () => {
    const { pageContent } = renderAlert(alert, 'baseline');
    for (const field of [
      'cloud.account.id',
      'user.id',
      'source.as.number',
      'user_agent.original',
    ]) {
      expect(pageContent).not.toContain(`${field},`);
    }
  });

  it('adds the identity fields in the enriched variant', () => {
    const { pageContent } = renderAlert(alert, 'enriched');
    expect(pageContent).toContain('cloud.account.id,111');
    expect(pageContent).toContain('user.id,arn:aws:iam::111:user/alice');
    expect(pageContent).toContain('source.as.number,64500');
    expect(pageContent).toContain('user_agent.original,aws-cli/2.15.0');
  });

  it('keeps raw values instead of replacing them with anonymization tokens', () => {
    expect(renderAlert(alert, 'enriched').pageContent).toContain('user.name,alice');
  });

  it('drops fields that are in neither variant', () => {
    const withExtra: AuditAlert = { ...alert, fields: { ...alert.fields, 'not.allowed': 'x' } };
    expect(renderAlert(withExtra, 'enriched').pageContent).not.toContain('not.allowed');
  });
});

describe('parseAlertCsv', () => {
  it('round-trips a rendered alert', () => {
    const parsed = parseAlertCsv(renderAlert(alert, 'enriched').pageContent);
    expect(parsed.id).toBe('abc123');
    expect(alertHasValue(parsed, 'user.name', 'alice')).toBe(true);
    expect(alertHasValue(parsed, 'cloud.account.id', '111')).toBe(true);
  });

  it('matches values case-insensitively and ignores surrounding whitespace', () => {
    const parsed = parseAlertCsv('_id,x\nhost.name,Web-1');
    expect(alertHasValue(parsed, 'host.name', ' web-1 ')).toBe(true);
  });

  it('does not match a different value or a missing field', () => {
    const parsed = parseAlertCsv('_id,x\nhost.name,web-1');
    expect(alertHasValue(parsed, 'host.name', 'web-2')).toBe(false);
    expect(alertHasValue(parsed, 'user.name', 'web-1')).toBe(false);
  });
});
