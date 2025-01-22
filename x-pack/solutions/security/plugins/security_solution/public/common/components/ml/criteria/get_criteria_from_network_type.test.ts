/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCriteriaFromNetworkType } from './get_criteria_from_network_type';
import { NetworkType } from '../../../../explore/network/store/model';
import { FlowTarget } from '../../../../../common/search_strategy';

describe('get_criteria_from_network_type', () => {
  test('returns network names from criteria if the network type is details and it is source', () => {
    const criteria = getCriteriaFromNetworkType(
      NetworkType.details,
      '127.0.0.1',
      FlowTarget.source
    );
    expect(criteria).toEqual([{ fieldName: 'source.ip', fieldValue: '127.0.0.1' }]);
  });

  test('returns network names from criteria if the network type is details and it is destination', () => {
    const criteria = getCriteriaFromNetworkType(
      NetworkType.details,
      '127.0.0.1',
      FlowTarget.destination
    );
    expect(criteria).toEqual([{ fieldName: 'destination.ip', fieldValue: '127.0.0.1' }]);
  });

  test('returns empty array if the network type is page', () => {
    const criteria = getCriteriaFromNetworkType(
      NetworkType.page,
      '127.0.0.1',
      FlowTarget.destination
    );
    expect(criteria).toEqual([]);
  });

  test('returns empty array if flowTarget is missing', () => {
    const criteria = getCriteriaFromNetworkType(NetworkType.page, '127.0.0.1');
    expect(criteria).toEqual([]);
  });
});
