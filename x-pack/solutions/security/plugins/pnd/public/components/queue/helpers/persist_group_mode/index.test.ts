/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_QUEUE_GROUP_MODE,
  QUEUE_GROUP_MODE_STORAGE_KEY,
  QUEUE_GROUP_MODES,
} from '../../types';
import { readQueueGroupMode, writeQueueGroupMode } from '.';

describe('persist_group_mode', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('defaults to group by type, which is the designed home-page view', () => {
    expect(readQueueGroupMode()).toEqual('type');
  });

  it('exposes type as the default constant the control seeds from', () => {
    expect(DEFAULT_QUEUE_GROUP_MODE).toEqual('type');
  });

  it('offers the three selectable modes, in the order the menu draws them', () => {
    expect(QUEUE_GROUP_MODES).toEqual(['type', 'type-thread', 'thread']);
  });

  it('writes the selected mode to sessionStorage', () => {
    writeQueueGroupMode('thread');

    expect(window.sessionStorage.getItem(QUEUE_GROUP_MODE_STORAGE_KEY)).toEqual('thread');
  });

  it('reads a previously written mode back', () => {
    writeQueueGroupMode('type-thread');

    expect(readQueueGroupMode()).toEqual('type-thread');
  });

  it('falls back to type when sessionStorage holds an unknown value', () => {
    window.sessionStorage.setItem(QUEUE_GROUP_MODE_STORAGE_KEY, 'not-a-mode');

    expect(readQueueGroupMode()).toEqual('type');
  });

  it('falls back to type when sessionStorage is empty', () => {
    expect(readQueueGroupMode()).toEqual('type');
  });
});
