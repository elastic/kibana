/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { editMonitorNavigatorParams } from './edit_monitor';

describe('editMonitorNavigatorParams', () => {
  const { getLocation } = editMonitorNavigatorParams;

  it('links to the edit page without a query by default', async () => {
    expect((await getLocation({ configId: 'abc' })).path).toBe('/edit-monitor/abc');
  });

  it('appends spaceId to the query string when provided', async () => {
    expect((await getLocation({ configId: 'abc', spaceId: 'team-a' })).path).toBe(
      '/edit-monitor/abc?spaceId=team-a'
    );
  });
});
