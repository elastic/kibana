/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialSelection } from '.';
import { getMockAttackDiscoveryAlerts } from '../../../mock/mock_attack_discovery_alerts';

describe('getInitialSelection', () => {
  it('returns an empty object given an empty array', () => {
    const result = getInitialSelection([]);
    expect(result).toEqual({});
  });

  it('returns an object with all alert ids set to false for multiple alerts', () => {
    const alerts = getMockAttackDiscoveryAlerts();
    const result = getInitialSelection(alerts);

    expect(result).toEqual({
      '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60': false,
      'b8a1be79-54af-4c1e-a71e-291a7b93b769': false,
    });
  });
});
