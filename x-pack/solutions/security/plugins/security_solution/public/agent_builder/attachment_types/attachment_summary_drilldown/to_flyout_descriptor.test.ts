/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { toAlertDescriptor } from './to_flyout_descriptor';

const attachmentOf = (type: string, data: unknown): UnknownAttachment => ({
  id: 'attachment-1',
  type,
  data,
});

/** What `stringifyEssentialAlertData` writes: JSON of picked fields, each value an array. */
const alertAttachment = (fields: Record<string, unknown>) =>
  attachmentOf(SecurityAgentBuilderAttachments.alert, { alert: JSON.stringify(fields) });

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
