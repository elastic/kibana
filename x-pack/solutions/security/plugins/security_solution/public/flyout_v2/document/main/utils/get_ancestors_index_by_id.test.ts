/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import {
  EVENT_SOURCE_FIELD_NAME,
  LEGACY_EVENT_SOURCE_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { ANCESTOR_INDEX, LEGACY_ANCESTOR_INDEX } from '../constants/field_names';
import { getAncestorsIndexById } from './get_ancestors_index_by_id';

const item = (field: string, values: string[]): TimelineEventsDetailsItem => ({
  field,
  values,
  isObjectArray: false,
});

describe('getAncestorsIndexById', () => {
  it('maps a single ancestor id to its index', () => {
    const data = [
      item(EVENT_SOURCE_FIELD_NAME, ['ancestor-1']),
      item(ANCESTOR_INDEX, ['.ds-logs-source-1']),
    ];

    expect(getAncestorsIndexById(data)).toEqual({ 'ancestor-1': '.ds-logs-source-1' });
  });

  it('aligns multiple ancestor ids with their indices by position', () => {
    const data = [
      item(EVENT_SOURCE_FIELD_NAME, ['ancestor-1', 'ancestor-2']),
      item(ANCESTOR_INDEX, ['.ds-logs-source-1', '.internal.alerts-security.alerts-default']),
    ];

    expect(getAncestorsIndexById(data)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
      'ancestor-2': '.internal.alerts-security.alerts-default',
    });
  });

  it('maps ancestor ids from the legacy signal.ancestors.* fields', () => {
    const data = [
      item(LEGACY_EVENT_SOURCE_FIELD_NAME, ['ancestor-1']),
      item(LEGACY_ANCESTOR_INDEX, ['.ds-logs-source-1']),
    ];

    expect(getAncestorsIndexById(data)).toEqual({ 'ancestor-1': '.ds-logs-source-1' });
  });

  it('merges ancestor ids from both the current and legacy fields', () => {
    const data = [
      item(EVENT_SOURCE_FIELD_NAME, ['ancestor-1']),
      item(ANCESTOR_INDEX, ['.ds-logs-source-1']),
      item(LEGACY_EVENT_SOURCE_FIELD_NAME, ['ancestor-2']),
      item(LEGACY_ANCESTOR_INDEX, ['.ds-logs-source-2']),
    ];

    expect(getAncestorsIndexById(data)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
      'ancestor-2': '.ds-logs-source-2',
    });
  });

  it('returns an empty map for threshold rules to avoid linking the synthetic ancestor', () => {
    const data = [
      item(ALERT_RULE_TYPE, ['threshold']),
      item(EVENT_SOURCE_FIELD_NAME, ['fake-ancestor']),
      item(ANCESTOR_INDEX, ['.ds-logs-source-1']),
    ];

    expect(getAncestorsIndexById(data)).toEqual({});
  });

  it('skips ancestor ids that have no aligned index', () => {
    const data = [
      item(EVENT_SOURCE_FIELD_NAME, ['ancestor-1', 'ancestor-2']),
      item(ANCESTOR_INDEX, ['.ds-logs-source-1']),
    ];

    expect(getAncestorsIndexById(data)).toEqual({ 'ancestor-1': '.ds-logs-source-1' });
  });

  it('returns an empty map when there are no ancestor ids', () => {
    expect(getAncestorsIndexById([item(ANCESTOR_INDEX, ['.ds-logs-source-1'])])).toEqual({});
    expect(getAncestorsIndexById([])).toEqual({});
  });
});
