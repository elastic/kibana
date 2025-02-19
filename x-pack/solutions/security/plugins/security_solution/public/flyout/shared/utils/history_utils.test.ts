/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelHistory } from '@kbn/expandable-flyout';
import { getProcessedHistory } from './history_utils';

const date1 = Date.now(); // oldest
const date2 = date1 + 1;
const date3 = date2 + 1;
const date4 = date3 + 1;
const date5 = date4 + 1;
const date6 = date5 + 1; // newest

describe('getProcessedHistory', () => {
  const singleEntryHistory: FlyoutPanelHistory[] = [{ lastOpen: date1, panel: { id: '1' } }];
  const simpleHistory: FlyoutPanelHistory[] = [
    { lastOpen: date1, panel: { id: '1' } },
    { lastOpen: date2, panel: { id: '2' } },
    { lastOpen: date3, panel: { id: '3' } },
    { lastOpen: date4, panel: { id: '4' } },
  ];
  const complexHistory: FlyoutPanelHistory[] = [
    { lastOpen: date1, panel: { id: '1' } },
    { lastOpen: date2, panel: { id: '2' } },
    { lastOpen: date3, panel: { id: '1' } },
    { lastOpen: date4, panel: { id: '3' } },
    { lastOpen: date5, panel: { id: '4' } },
    { lastOpen: date6, panel: { id: '2' } },
  ];

  it('should return a reversed history array and remove newest entry', () => {
    // input: 1, 2, 3, 4
    // reverse: 4, 3, 2, 1
    // remove newest: 3, 2, 1
    const processedHistory = getProcessedHistory({ history: simpleHistory, maxCount: 5 });
    expect(processedHistory).toEqual([
      { lastOpen: date3, panel: { id: '3' } },
      { lastOpen: date2, panel: { id: '2' } },
      { lastOpen: date1, panel: { id: '1' } },
    ]);
  });

  it('should return only the amount of entries requested', () => {
    // input: 1, 2, 3, 4
    // reverse: 4, 3, 2, 1
    // remove newest: 3, 2, 1
    // keep maxCount: 3, 2
    const processedHistory = getProcessedHistory({ history: simpleHistory, maxCount: 2 });
    expect(processedHistory).toEqual([
      { lastOpen: date3, panel: { id: '3' } },
      { lastOpen: date2, panel: { id: '2' } },
    ]);
  });

  it('should remove all duplicates', () => {
    // input: 1, 2, 1, 3, 4, 2
    // reverse: 2, 4, 3, 1, 2, 1
    // remove duplicates: 2, 4, 3, 1
    // remove newest: 4, 3, 1
    const processedHistory = getProcessedHistory({ history: complexHistory, maxCount: 5 });
    expect(processedHistory).toEqual([
      { lastOpen: date5, panel: { id: '4' } },
      { lastOpen: date4, panel: { id: '3' } },
      { lastOpen: date3, panel: { id: '1' } },
    ]);
  });

  it('should return empty array if history only has one entry', () => {
    const processedHistory = getProcessedHistory({ history: singleEntryHistory, maxCount: 5 });
    expect(processedHistory).toEqual([]);
  });

  it('should return empty array if history is empty', () => {
    const processedHistory = getProcessedHistory({ history: [], maxCount: 5 });
    expect(processedHistory).toEqual([]);
  });
});
