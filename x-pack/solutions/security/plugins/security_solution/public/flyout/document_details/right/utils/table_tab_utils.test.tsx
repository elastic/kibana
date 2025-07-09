/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTableItems } from './table_tab_utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

const testData = [
  {
    field: 'b',
    values: ['valueb'],
  },
  {
    field: 'kibana.alert.rule.name',
    values: ['rule name'],
  },
  {
    field: 'a',
    values: ['valuea'],
  },
  {
    field: 'empty',
    values: [''],
  },
];
const result = {
  a: {
    name: 'fieldA',
    field: 'a',
    values: ['valuea'],
    valuesConcatenated: 'valuea',
    isPinned: false,
    ariaRowindex: 1,
  },
  b: {
    name: 'fieldB',
    field: 'b',
    values: ['valueb'],
    valuesConcatenated: 'valueb',
    isPinned: false,
    ariaRowindex: 2,
  },
  empty: {
    name: 'emptyField',
    field: 'empty',
    values: [''],
    valuesConcatenated: '',
    isPinned: false,
    ariaRowindex: 3,
  },
  alert: {
    name: 'kibana.alert.rule.name',
    field: 'kibana.alert.rule.name',
    values: ['rule name'],
    valuesConcatenated: 'rule name',
    isPinned: false,
    ariaRowindex: 4,
  },
};
const mockFieldsByName = {
  a: { name: 'fieldA' },
  b: { name: 'fieldB' },
  empty: { name: 'emptyField' },
  'kibana.alert.rule.name': { name: 'kibana.alert.rule.name' },
};

describe('getTableItems', () => {
  it('should return the table items in alphabetical order', () => {
    const tableItems = getTableItems({
      dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
      fieldsByName: mockFieldsByName,
      highlightedFields: [],
      tableTabState: {
        pinnedFields: [],
        showHighlightedFields: false,
        hideEmptyFields: false,
        hideAlertFields: false,
      },
    });
    expect(tableItems).toEqual([result.a, result.b, result.empty, result.alert]);
  });

  it('should return only highlighted fields if showHighlightedFields is true', () => {
    const tableItems = getTableItems({
      dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
      fieldsByName: mockFieldsByName,
      highlightedFields: ['a', 'b'],
      tableTabState: {
        pinnedFields: [],
        showHighlightedFields: true,
        hideEmptyFields: false,
        hideAlertFields: false,
      },
    });
    expect(tableItems).toEqual([result.a, result.b]);
  });

  it('should return pinned fields first', () => {
    const tableItems = getTableItems({
      dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
      fieldsByName: mockFieldsByName,
      highlightedFields: [],
      tableTabState: {
        pinnedFields: ['kibana.alert.rule.name', 'empty'],
        showHighlightedFields: false,
        hideEmptyFields: false,
        hideAlertFields: false,
      },
    });
    expect(tableItems).toEqual([
      { ...result.empty, isPinned: true },
      { ...result.alert, isPinned: true },

      result.a,
      result.b,
    ]);
  });

  it('should return correct items when there are pinned fields and showHighlightedFields is true', () => {
    const tableItems = getTableItems({
      dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
      fieldsByName: mockFieldsByName,
      highlightedFields: ['a', 'b', 'kibana.alert.rule.name'],
      tableTabState: {
        pinnedFields: ['b', 'empty'],
        showHighlightedFields: true,
        hideEmptyFields: false,
        hideAlertFields: false,
      },
    });
    expect(tableItems).toEqual([{ ...result.b, isPinned: true }, result.a, result.alert]);
  });

  describe('hideEmptyFields', () => {
    it('should hide empty fields if hideEmptyFields is true', () => {
      const tableItems = getTableItems({
        dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
        fieldsByName: mockFieldsByName,
        highlightedFields: [],
        tableTabState: {
          pinnedFields: [],
          showHighlightedFields: false,
          hideEmptyFields: true,
          hideAlertFields: false,
        },
      });
      expect(tableItems).toEqual([result.a, result.b, result.alert]);
    });

    it('should  hide empty fields correctly for highlighted fields', () => {
      const tableItems = getTableItems({
        dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
        fieldsByName: mockFieldsByName,
        highlightedFields: ['a', 'empty'],
        tableTabState: {
          pinnedFields: [],
          showHighlightedFields: true,
          hideEmptyFields: true,
          hideAlertFields: false,
        },
      });
      expect(tableItems).toEqual([result.a]);
    });

    it('should  hide empty fields correctly for pinned fields', () => {
      const tableItems = getTableItems({
        dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
        fieldsByName: mockFieldsByName,
        highlightedFields: [],
        tableTabState: {
          pinnedFields: ['b', 'kibana.alert.rule.name', 'empty'],
          showHighlightedFields: false,
          hideEmptyFields: true,
          hideAlertFields: false,
        },
      });
      expect(tableItems).toEqual([
        { ...result.b, isPinned: true },
        { ...result.alert, isPinned: true },
        result.a,
      ]);
    });
  });

  describe('hideAlertFields', () => {
    it('should hide alert fields if hideAlertFields is true', () => {
      const tableItems = getTableItems({
        dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
        fieldsByName: mockFieldsByName,
        highlightedFields: [],
        tableTabState: {
          pinnedFields: ['a'],
          showHighlightedFields: false,
          hideEmptyFields: false,
          hideAlertFields: true,
        },
      });
      expect(tableItems).toEqual([
        { ...result.a, isPinned: true },
        { ...result.b, isPinned: false },
        result.empty,
      ]);
    });

    it('should hide alert fields correctly for highlighted fields', () => {
      const tableItems = getTableItems({
        dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
        fieldsByName: mockFieldsByName,
        highlightedFields: ['a', 'kibana.alert.rule.name'],
        tableTabState: {
          pinnedFields: [],
          showHighlightedFields: true,
          hideEmptyFields: false,
          hideAlertFields: true,
        },
      });
      expect(tableItems).toEqual([result.a]);
    });

    it('should hide alert fields correctly for pinned fields', () => {
      const tableItems = getTableItems({
        dataFormattedForFieldBrowser: testData as unknown as TimelineEventsDetailsItem[],
        fieldsByName: mockFieldsByName,
        highlightedFields: [],
        tableTabState: {
          pinnedFields: ['a', 'kibana.alert.rule.name'],
          showHighlightedFields: false,
          hideEmptyFields: false,
          hideAlertFields: true,
        },
      });
      expect(tableItems).toEqual([{ ...result.a, isPinned: true }, result.b, result.empty]);
    });
  });
});
