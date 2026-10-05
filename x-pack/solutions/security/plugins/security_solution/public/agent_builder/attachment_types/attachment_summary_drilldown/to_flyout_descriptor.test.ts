/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { toAlertDescriptor, toRuleDescriptor } from './to_flyout_descriptor';

const attachmentOf = (type: string, data: unknown): UnknownAttachment => ({
  id: 'attachment-1',
  type,
  data,
});

/** What `stringifyEssentialAlertData` writes: JSON of picked fields, each value an array. */
const alertAttachment = (fields: Record<string, unknown>) =>
  attachmentOf(SecurityAgentBuilderAttachments.alert, { alert: JSON.stringify(fields) });

const ruleAttachment = (data: unknown, origin?: string): UnknownAttachment => ({
  id: 'attachment-rule-1',
  type: SecurityAgentBuilderAttachments.rule,
  data,
  ...(origin ? { origin } : {}),
});

describe('toRuleDescriptor', () => {
  it('opens the rule flyout for the id in data.text', () => {
    const descriptor = toRuleDescriptor(
      ruleAttachment({
        text: JSON.stringify({ id: 'so-id-abc', rule_id: 'sig-id-abc', name: 'My Rule' }),
      })
    );
    expect(descriptor).toEqual({ kind: 'rule', ruleId: 'so-id-abc' });
  });

  it('prefers text.id over origin when both are present', () => {
    const descriptor = toRuleDescriptor(
      ruleAttachment(
        { text: JSON.stringify({ id: 'so-id-from-text', rule_id: 'sig-id' }) },
        'sig-id-from-origin'
      )
    );
    expect(descriptor).toEqual({ kind: 'rule', ruleId: 'so-id-from-text' });
  });

  it('falls back to origin when text carries no id (browser Add to chat producers)', () => {
    const descriptor = toRuleDescriptor(
      ruleAttachment(
        { text: JSON.stringify({ rule_id: 'sig-id', name: 'My Rule' }) },
        'so-id-origin'
      )
    );
    expect(descriptor).toEqual({ kind: 'rule', ruleId: 'so-id-origin' });
  });

  it('returns null for a draft attachment with no id anywhere', () => {
    expect(
      toRuleDescriptor(ruleAttachment({ text: JSON.stringify({ rule_id: 'sig', name: 'Draft' }) }))
    ).toBeNull();
  });

  it.each([
    ['text is prose', { text: 'Rule name: X\nError: Y' }],
    ['text is malformed JSON', { text: '{' }],
    ['text is a JSON string (not object)', { text: '"just a string"' }],
    ['text is a JSON array', { text: '[1,2,3]' }],
    ['text is an empty object {}', { text: '{}' }],
    ['there is no data.text field', {}],
  ])('returns null when %s and no origin', (_, data) => {
    expect(toRuleDescriptor(ruleAttachment(data))).toBeNull();
  });

  it('uses origin when text is prose', () => {
    const descriptor = toRuleDescriptor(
      ruleAttachment({ text: 'Rule name: My Rule\nError: failed' }, 'so-id-fallback')
    );
    expect(descriptor).toEqual({ kind: 'rule', ruleId: 'so-id-fallback' });
  });
});

describe('toAlertDescriptor', () => {
  it('opens the document flyout for the alert the payload names', () => {
    const descriptor = toAlertDescriptor(
      alertAttachment({
        _id: ['alert-1'],
        _index: ['.internal.alerts-security.alerts-default-000001'],
        'kibana.alert.rule.name': ['Endpoint Security'],
      })
    );

    expect(descriptor).toEqual({
      kind: 'document',
      documentId: 'alert-1',
      indexName: '.internal.alerts-security.alerts-default-000001',
    });
  });

  it('accepts scalar fields, since the payload is whatever the producer wrote', () => {
    const descriptor = toAlertDescriptor(
      alertAttachment({ _id: 'alert-1', _index: '.internal.alerts-1' })
    );

    expect(descriptor).toEqual({
      kind: 'document',
      documentId: 'alert-1',
      indexName: '.internal.alerts-1',
    });
  });

  it.each([
    ['the id is missing', { _index: ['.internal.alerts-1'] }],
    ['the index is missing', { _id: ['alert-1'] }],
  ])('returns null when %s', (_, fields) => {
    expect(toAlertDescriptor(alertAttachment(fields))).toBeNull();
  });

  it.each([
    ['the payload is prose rather than JSON', { alert: 'Alert 04784eda — Suspicious activity' }],
    ['the payload is markdown', { alert: '## Attack discovery\n\nA host was compromised.' }],
    ['the JSON does not parse', { alert: '{' }],
    ['the JSON is not an object', { alert: '"just a string"' }],
    ['there is no alert at all', {}],
    ['the alert is not a string', { alert: { _id: 'alert-1' } }],
  ])('returns null when %s', (_, data) => {
    expect(toAlertDescriptor(attachmentOf(SecurityAgentBuilderAttachments.alert, data))).toBeNull();
  });
});
