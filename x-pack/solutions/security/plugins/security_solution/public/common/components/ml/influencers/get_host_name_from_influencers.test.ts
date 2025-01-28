/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostNameFromInfluencers } from './get_host_name_from_influencers';
import { mockAnomalies } from '../mock';

describe('get_host_name_from_influencers', () => {
  test('returns host names from influencers from the mock', () => {
    expect(getHostNameFromInfluencers(mockAnomalies.anomalies[0].influencers)).toEqual('zeek-iowa');
  });

  test('returns null if there are no influencers from the mock', () => {
    expect(getHostNameFromInfluencers([])).toEqual(null);
  });

  test('returns null if it is given undefined influencers', () => {
    expect(getHostNameFromInfluencers()).toEqual(null);
  });

  test('returns null if there influencers is an empty object', () => {
    expect(getHostNameFromInfluencers([{}])).toEqual(null);
  });

  test('returns host name mixed with other data', () => {
    const hostName = getHostNameFromInfluencers([
      { 'host.name': 'name-1' },
      { 'source.ip': '127.0.0.1' },
    ]);
    expect(hostName).toEqual('name-1');
  });
});
