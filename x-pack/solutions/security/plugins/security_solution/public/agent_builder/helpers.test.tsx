/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { SecurityAgentBuilderAttachments } from '../../common/constants';
import { alertsToAttachmentInputs, stringifyEssentialAlertData } from './helpers';

const makeItem = (id: string) =>
  ({ _id: id, data: [], ecs: { _id: id, _index: '' } } as unknown as Parameters<
    typeof alertsToAttachmentInputs
  >[0][number]);

describe('alertsToAttachmentInputs', () => {
  it('returns a single visible attachment for ≤20 alerts', () => {
    const items = Array.from({ length: 5 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentInputs(items);

    expect(result).toHaveLength(1);
    expect(result[0].hidden).toBeFalsy();
    expect(result[0].data?.attachmentLabel).toBe('5 Alerts');
    expect(result[0].type).toBe(SecurityAgentBuilderAttachments.alerts);
  });

  it('returns N batches with only the first visible for >20 alerts', () => {
    const items = Array.from({ length: 50 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentInputs(items);

    expect(result).toHaveLength(3);
    expect(result[0].hidden).toBeFalsy();
    expect(result[0].data?.attachmentLabel).toBe('50 Alerts');
    expect(result[1].hidden).toBe(true);
    expect(result[1].data?.attachmentLabel).toBeUndefined();
    expect(result[2].hidden).toBe(true);
  });

  it('uses singular label for 1 alert', () => {
    const result = alertsToAttachmentInputs([makeItem('x')]);
    expect(result[0].data?.attachmentLabel).toBe('1 Alert');
  });

  it('each batch contains the correct alert IDs', () => {
    const items = Array.from({ length: 25 }, (_, i) => makeItem(`id-${i}`));
    const result = alertsToAttachmentInputs(items);

    expect(result[0].data?.alertIds).toHaveLength(20);
    expect(result[1].data?.alertIds).toHaveLength(5);
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
