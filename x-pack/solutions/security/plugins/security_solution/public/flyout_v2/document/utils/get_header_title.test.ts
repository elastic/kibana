/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';

import { getDocumentTitle, getAlertTitle, getEventTitle } from './get_header_title';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('getAlertTitle', () => {
  it('returns the rule name when provided', () => {
    expect(getAlertTitle('test rule')).toBe('test rule');
  });

  it('returns Document details when ruleName is undefined', () => {
    expect(getAlertTitle(undefined)).toBe('Document details');
  });

  it('returns Document details when ruleName is null', () => {
    expect(getAlertTitle(null)).toBe('Document details');
  });
});

describe('getEventTitle', () => {
  it('returns the mapped field value when event kind is event and category is known', () => {
    expect(
      getEventTitle('event', 'process', (field) =>
        field === 'process.name' ? 'process name' : undefined
      )
    ).toBe('process name');
  });

  it('returns Event details when event kind is event but mapped field is missing', () => {
    expect(getEventTitle('event', 'process', () => undefined)).toBe('Event details');
  });

  it('returns Event details when event kind is event but category is unmapped', () => {
    expect(getEventTitle('event', 'configuration', () => undefined)).toBe('Event details');
  });

  it('returns Event details when event kind is event but category is null', () => {
    expect(getEventTitle('event', null, () => undefined)).toBe('Event details');
  });

  it('returns External alert details when event kind is alert', () => {
    expect(getEventTitle('alert', null, () => undefined)).toBe('External alert details');
  });

  it('returns start-cased event kind for other event kinds', () => {
    expect(getEventTitle('metric', null, () => undefined)).toBe('Metric details');
  });

  it('returns Event details when event kind is null', () => {
    expect(getEventTitle(null, null, () => undefined)).toBe('Event details');
  });

  it('returns Event details when event kind is undefined', () => {
    expect(getEventTitle(undefined, undefined, () => undefined)).toBe('Event details');
  });
});

describe('getDocumentTitle', () => {
  it('returns the rule name for signals', () => {
    const hit = createMockHit({
      'event.kind': 'signal',
      'kibana.alert.rule.name': 'Suspicious Process Rule',
    });

    expect(getDocumentTitle(hit)).toBe('Suspicious Process Rule');
  });

  it('returns the default document title when a signal has no rule name', () => {
    const hit = createMockHit({
      'event.kind': 'signal',
    });

    expect(getDocumentTitle(hit)).toBe('Document details');
  });

  it('returns the mapped field value for categorized events', () => {
    const hit = createMockHit({
      'event.kind': 'event',
      'event.category': 'process',
      'process.name': 'powershell.exe',
    });

    expect(getDocumentTitle(hit)).toBe('powershell.exe');
  });

  it('returns the default event title when the mapped event field is missing', () => {
    const hit = createMockHit({
      'event.kind': 'event',
      'event.category': 'process',
    });

    expect(getDocumentTitle(hit)).toBe('Event details');
  });

  it('returns the default event title when the event category is missing', () => {
    const hit = createMockHit({
      'event.kind': 'event',
    });

    expect(getDocumentTitle(hit)).toBe('Event details');
  });

  it('returns the default event title when the event category is unmapped', () => {
    const hit = createMockHit({
      'event.kind': 'event',
      'event.category': 'configuration',
    });

    expect(getDocumentTitle(hit)).toBe('Event details');
  });

  it('returns the external alert title for external alerts', () => {
    const hit = createMockHit({
      'event.kind': 'alert',
    });

    expect(getDocumentTitle(hit)).toBe('External alert details');
  });

  it('returns a start-cased title for other event kinds', () => {
    const hit = createMockHit({
      'event.kind': 'enrichment_pipeline',
    });

    expect(getDocumentTitle(hit)).toBe('Enrichment Pipeline details');
  });

  it('returns the default event title when event.kind is missing', () => {
    const hit = createMockHit({});

    expect(getDocumentTitle(hit)).toBe('Event details');
  });
});
