/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAlertCsv, alertHasValue } from './alert_csv';
import { deanonymize, renderAlert, renderAlerts } from './render_alert';
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
  it('renders the product field,value format with sorted keys, the _id and anonymized names', () => {
    const { pageContent } = renderAlert(alert, 'baseline');
    const lines = pageContent.split('\n');
    expect(lines.map((line) => line.split(',')[0])).toEqual([
      '_id',
      'host.name',
      'source.ip',
      'user.name',
    ]);
    expect(lines[0]).toBe('_id,abc123');
    expect(lines[2]).toBe('source.ip,203.0.113.50');
    expect(lines[1]).toMatch(
      /^host\.name,[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
    );
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

  it('replaces user.name and host.name with tokens, but not fields outside the replacement set', () => {
    const { pageContent } = renderAlert(alert, 'enriched');
    expect(pageContent).not.toContain('user.name,alice');
    expect(pageContent).not.toContain('host.name,web-1');
    expect(pageContent).toContain('source.ip,203.0.113.50');
    expect(pageContent).toContain('user.id,arn:aws:iam::111:user/alice');
  });

  it('maps tokens back to the original values with the product helper', () => {
    const { anonymizedAlerts, replacements } = renderAlerts([alert], 'enriched', 'seed');
    expect(Object.values(replacements).sort()).toEqual(['alice', 'web-1']);
    const restored = deanonymize(anonymizedAlerts[0].pageContent, replacements);
    expect(restored).toContain('user.name,alice');
    expect(restored).toContain('host.name,web-1');
  });

  it('uses one token per value across alerts, so the same user stays linkable', () => {
    const second: AuditAlert = { id: 'def456', fields: { 'user.name': 'alice' } };
    const [first, other] = renderAlerts([alert, second], 'baseline', 'seed').anonymizedAlerts;
    const tokenOf = (content: string) => /user\.name,(.+)/.exec(content)?.[1];
    expect(tokenOf(first.pageContent)).toBe(tokenOf(other.pageContent));
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
    expect(alertHasValue(parsed, 'source.ip', '203.0.113.50')).toBe(true);
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
