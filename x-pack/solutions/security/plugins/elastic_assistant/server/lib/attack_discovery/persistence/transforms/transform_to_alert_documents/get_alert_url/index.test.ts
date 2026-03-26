/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertUrl } from '.';

describe('getAlertUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined if `basePath` is undefined', async () => {
    const detailsUrl = getAlertUrl({ alertDocId: 'attack-1' });

    expect(detailsUrl).toBeUndefined();
  });

  it('should return URL pointing to default space if `spaceId` is undefined', async () => {
    const detailsUrl = getAlertUrl({ alertDocId: 'attack-2', basePath: 'http://test.com' });

    expect(detailsUrl).toEqual('http://test.com/app/security/attack_discovery?id=attack-2');
  });

  it('should return URL pointing to default space if `spaceId` is `default`', async () => {
    const detailsUrl = getAlertUrl({
      alertDocId: 'attack-3',
      basePath: 'http://test.com',
      spaceId: 'default',
    });

    expect(detailsUrl).toEqual('http://test.com/app/security/attack_discovery?id=attack-3');
  });

  it('should return URL pointing to correct space if `spaceId` is passed', async () => {
    const detailsUrl = getAlertUrl({
      alertDocId: 'attack-4',
      basePath: 'http://test.com',
      spaceId: 'fake-space',
    });

    expect(detailsUrl).toEqual(
      'http://test.com/s/fake-space/app/security/attack_discovery?id=attack-4'
    );
  });
});
