/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SloDetailsLocatorDefinition } from './slo_details';

describe('SloDetailsLocator', () => {
  const locator = new SloDetailsLocatorDefinition();

  it('returns correct url when sloId is provided', async () => {
    const location = await locator.getLocation({ sloId: 'foo' });
    expect(location.path).toEqual('/foo');
  });

  it('returns correct url when sloId and instanceId are provided', async () => {
    const location = await locator.getLocation({
      sloId: 'some-slo_id',
      instanceId: 'another-instance_id',
    });
    expect(location.path).toEqual('/some-slo_id?instanceId=another-instance_id');
  });

  it("returns correct url when sloId and instanceId='*' is provided", async () => {
    const location = await locator.getLocation({
      sloId: 'some-slo_id',
      instanceId: '*',
    });
    expect(location.path).toEqual('/some-slo_id');
  });

  it('returns correct url when instanceId and tabId are specified', async () => {
    const location = await locator.getLocation({
      sloId: 'slo_id',
      instanceId: 'instance_id',
      tabId: 'history',
    });
    expect(location.path).toEqual('/slo_id/history?instanceId=instance_id');
  });

  it('returns correct url when tabId is specified', async () => {
    const location = await locator.getLocation({
      sloId: 'slo_id',
      tabId: 'history',
    });
    expect(location.path).toEqual('/slo_id/history');
  });
});
