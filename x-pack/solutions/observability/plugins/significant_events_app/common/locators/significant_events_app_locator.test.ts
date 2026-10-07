/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignificantEventsAppLocatorDefinition } from './significant_events_app_locator';

describe('SignificantEventsAppLocatorDefinition', () => {
  const locator = new SignificantEventsAppLocatorDefinition();

  it('defaults to the sources tab with no query params', async () => {
    const location = await locator.getLocation({});

    expect(location).toEqual({
      app: 'significantEvents',
      path: '/sources',
      state: {},
    });
  });

  it('builds a path for the cortex tab', async () => {
    const { path } = await locator.getLocation({ tab: 'cortex' });

    expect(path).toBe('/cortex');
  });

  it('serializes scalar query params', async () => {
    const { path } = await locator.getLocation({
      tab: 'significant_events',
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      selectedEvent: 'event-1',
    });

    expect(path).toBe('/significant_events?rangeFrom=now-24h&rangeTo=now&selectedEvent=event-1');
  });

  it('serializes array query params as repeated keys', async () => {
    const { path } = await locator.getLocation({
      tab: 'knowledge_indicators',
      source: ['source-1', 'source-2'],
    });

    expect(path).toBe('/knowledge_indicators?source=source-1&source=source-2');
  });

  it('serializes significant events filters as repeated keys', async () => {
    const { path } = await locator.getLocation({
      tab: 'significant_events',
      status: ['open', 'closed'],
      severity: ['critical', 'high'],
    });

    expect(path).toBe(
      '/significant_events?status=open&status=closed&severity=critical&severity=high'
    );
  });

  it('encodes an empty status/severity selection explicitly and omits other empty arrays', async () => {
    const { path } = await locator.getLocation({
      tab: 'significant_events',
      status: [],
      severity: [],
    });

    expect(path).toBe('/significant_events?status=&severity=');
  });

  it('omits undefined params', async () => {
    const { path } = await locator.getLocation({
      tab: 'queries',
      search: undefined,
    });

    expect(path).toBe('/queries');
  });
});
