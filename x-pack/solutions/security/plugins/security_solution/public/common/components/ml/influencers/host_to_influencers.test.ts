/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts';
import type { InfluencerInput } from '../types';
import { hostToInfluencers } from './host_to_influencers';

describe('host_to_influencer', () => {
  test('converts a host to an influencer', () => {
    const hostItem: HostItem = {
      host: {
        name: ['host-name'],
      },
    };
    const expectedInfluencer: InfluencerInput[] = [
      {
        fieldName: 'host.name',
        fieldValue: 'host-name',
      },
    ];
    expect(hostToInfluencers(hostItem)).toEqual(expectedInfluencer);
  });

  test('returns a null if the host.name is null', () => {
    const hostItem: HostItem = {
      host: {
        // @ts-expect-error
        name: null,
      },
    };
    expect(hostToInfluencers(hostItem)).toEqual(null);
  });

  test('returns a null if the host is null', () => {
    const hostItem: HostItem = {
      host: null,
    };
    expect(hostToInfluencers(hostItem)).toEqual(null);
  });
});
