/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { SecurityAgentBuilderAttachments } from '../../common/constants';
import { alertsToAttachmentGroup, stringifyEssentialAlertData } from './helpers';

const makeItem = (id: string) =>
  ({ _id: id, data: [], ecs: { _id: id, _index: '' } } as unknown as Parameters<
    typeof alertsToAttachmentGroup
  >[0][number]);

describe('alertsToAttachmentGroup', () => {
  it('returns an AttachmentGroup with type "group"', () => {
    const items = [makeItem('a')];
    const result = alertsToAttachmentGroup(items);
    expect(result.type).toBe('group');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('returns a single item in items for ≤20 alerts', () => {
    const items = Array.from({ length: 5 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentGroup(items);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].hidden).toBeFalsy();
    expect(result.items[0].type).toBe(SecurityAgentBuilderAttachments.alerts);
  });

  it('returns N batches in items for >20 alerts', () => {
    const items = Array.from({ length: 50 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentGroup(items);

    expect(result.items).toHaveLength(3);
    result.items.forEach((item) => {
      expect(item.hidden).toBeFalsy();
    });
  });

  it('uses plural label for multiple alerts', () => {
    const items = Array.from({ length: 5 }, (_, i) => makeItem(`id-${i}`));
    expect(alertsToAttachmentGroup(items).label).toBe('5 Alerts');
  });

  it('uses singular label for 1 alert', () => {
    expect(alertsToAttachmentGroup([makeItem('x')]).label).toBe('1 Alert');
  });

  it('each batch contains the correct alert IDs', () => {
    const items = Array.from({ length: 25 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentGroup(items);

    expect(result.items[0].data).toEqual({ alertIds: items.slice(0, 20).map((i) => i._id) });
    expect(result.items[1].data).toEqual({ alertIds: items.slice(20).map((i) => i._id) });
  });

  it('items do not pre-stamp group_id or description (stamped by flattenAttachments)', () => {
    const items = Array.from({ length: 25 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentGroup(items);

    result.items.forEach((item) => {
      expect(item).not.toHaveProperty('group_id');
      expect(item).not.toHaveProperty('description');
      expect(item.hidden).toBeFalsy();
    });
  });

  it('group id is stable for the same set of alerts (enables deduplication)', () => {
    const items = Array.from({ length: 5 }, (_, i) => makeItem(`id-${i}`));
    expect(alertsToAttachmentGroup(items).id).toBe(alertsToAttachmentGroup(items).id);
  });

  it('group id differs for different alert sets', () => {
    const setA = [makeItem('a'), makeItem('b')];
    const setB = [makeItem('a'), makeItem('c')];
    expect(alertsToAttachmentGroup(setA).id).not.toBe(alertsToAttachmentGroup(setB).id);
  });
});

describe('stringifyEssentialAlertData', () => {
  it('filters to essential fields only', () => {
    const rawData: Record<string, string[]> = {
      [ESSENTIAL_ALERT_FIELDS[0]]: ['value1'],
      [ESSENTIAL_ALERT_FIELDS[1]]: ['value2'],
      nonEssentialField: ['shouldBeExcluded'],
      anotherNonEssential: ['shouldAlsoBeExcluded'],
    };

    const result = stringifyEssentialAlertData(rawData);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty(ESSENTIAL_ALERT_FIELDS[0]);
    expect(parsed).toHaveProperty(ESSENTIAL_ALERT_FIELDS[1]);
    expect(parsed).not.toHaveProperty('nonEssentialField');
    expect(parsed).not.toHaveProperty('anotherNonEssential');
  });

  it('excludes non-essential fields', () => {
    const rawData: Record<string, string[]> = {
      field1: ['value1'],
      field2: ['value2'],
    };

    const result = stringifyEssentialAlertData(rawData);
    const parsed = JSON.parse(result);

    expect(Object.keys(parsed).length).toBe(0);
  });

  it('returns valid JSON string', () => {
    const rawData: Record<string, string[]> = {
      [ESSENTIAL_ALERT_FIELDS[0]]: ['value1'],
    };

    const result = stringifyEssentialAlertData(rawData);

    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({
      [ESSENTIAL_ALERT_FIELDS[0]]: ['value1'],
    });
  });

  it('handles empty input', () => {
    const rawData: Record<string, string[]> = {};

    const result = stringifyEssentialAlertData(rawData);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({});
  });
});
