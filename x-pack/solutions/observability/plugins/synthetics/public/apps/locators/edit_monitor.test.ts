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

  it('combines spaceId and packagePolicyId into one query string', async () => {
    expect(
      (await getLocation({ configId: 'abc', spaceId: 'team-a', packagePolicyId: 'abc-loc' })).path
    ).toBe('/edit-monitor/abc?spaceId=team-a&packagePolicyId=abc-loc');
  });
});
