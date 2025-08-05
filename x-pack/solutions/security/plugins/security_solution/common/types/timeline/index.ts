/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './cells';
export type * from './columns';
export * from './data_provider';
export type * from './rows';
export type * from './store';

/**
 * Used for scrolling top inside a tab. Especially when swiching tabs.
 */
export interface ScrollToTopEvent {
  /**
   * Timestamp of the moment when the event happened.
   * The timestamp might be necessary for the scenario where the event could happen multiple times.
   */
  timestamp: number;
}

export enum TimelineTabs {
  query = 'query',
  notes = 'notes',
  pinned = 'pinned',
  eql = 'eql',
  esql = 'esql',
}

/*
 *  Timeline IDs
 */

export enum TimelineId {
  active = 'timeline-1',
  casePage = 'timeline-case',
  test = 'timeline-test', // Reserved for testing purposes
}

export type TimelineEventsType = 'all' | 'raw' | 'alert' | 'signal' | 'custom' | 'eql';
