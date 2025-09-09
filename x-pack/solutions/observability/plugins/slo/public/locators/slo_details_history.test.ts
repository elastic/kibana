/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { SloDetailsHistoryLocatorDefinition } from './slo_details_history';

describe('SloDetailsHistoryLocator', () => {
  const locator = new SloDetailsHistoryLocatorDefinition();

  it('returns correct url when id is provided', async () => {
    const location = await locator.getLocation({ id: 'some-id' });
    expect(location.path).toEqual('/some-id/history');
  });

  it('returns correct url when id and instanceId are provided', async () => {
    const location = await locator.getLocation({ id: 'some-id', instanceId: 'instance-1' });
    expect(location.path).toEqual('/some-id/history?instanceId=instance-1');
  });

  it('returns correct url when id and state are provided', async () => {
    const location = await locator.getLocation({
      id: 'some-id',
      encodedAppState: encode({
        range: { from: '2025-01-01T15:23:45.000Z', to: '2025-01-07T15:23:45.000Z' },
      }),
    });
    expect(location.path).toMatchInlineSnapshot(
      `"/some-id/history?_a=%28range%3A%28from%3A%272025-01-01T15%3A23%3A45.000Z%27%2Cto%3A%272025-01-07T15%3A23%3A45.000Z%27%29%29"`
    );
  });

  it('returns correct url when id, instanceId and state are provided', async () => {
    const location = await locator.getLocation({
      id: 'some-id',
      instanceId: 'instance-1',
      encodedAppState: encode({
        range: { from: '2025-01-01T15:23:45.000Z', to: '2025-01-07T15:23:45.000Z' },
      }),
    });
    expect(location.path).toMatchInlineSnapshot(
      `"/some-id/history?instanceId=instance-1&_a=%28range%3A%28from%3A%272025-01-01T15%3A23%3A45.000Z%27%2Cto%3A%272025-01-07T15%3A23%3A45.000Z%27%29%29"`
    );
  });
});
