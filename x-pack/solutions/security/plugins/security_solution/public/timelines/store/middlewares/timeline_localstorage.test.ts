/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { updateColumnWidth } from '../actions';
import {
  TIMELINE_COLUMNS_CONFIG_KEY,
  getStoredTimelineColumnsConfig,
  setStoredTimelineColumnsConfig,
} from './timeline_localstorage';

const initialWidth = 123456789;

describe('Timeline localStorage middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    jest.clearAllMocks();
    setStoredTimelineColumnsConfig(undefined);
  });

  it('should write the timeline column settings to localStorage', async () => {
    await store.dispatch(
      updateColumnWidth({ id: TimelineId.test, columnId: '@timestamp', width: initialWidth })
    );
    const storedConfig = getStoredTimelineColumnsConfig();
    expect(storedConfig!['@timestamp'].initialWidth).toBe(initialWidth);
  });

  it('should not fail to read the column config when localStorage contains a malformatted config', () => {
    localStorage.setItem(TIMELINE_COLUMNS_CONFIG_KEY, '1234');
    const storedConfig = getStoredTimelineColumnsConfig();
    expect(storedConfig).toBe(undefined);
  });
});
