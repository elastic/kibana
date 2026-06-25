/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertSearchBarStateContainer, DEFAULT_STATE } from './state_container';
import type { AlertStatus } from '../../../../common/typings';
import type { Filter } from '@kbn/es-query';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';

describe('alertSearchBarStateContainer', () => {
  it('should initialize with the default state', () => {
    expect(alertSearchBarStateContainer.get()).toEqual(DEFAULT_STATE);
  });

  it('should update rangeFrom using setRangeFrom', () => {
    const newRangeFrom = 'now-7d';
    alertSearchBarStateContainer.transitions.setRangeFrom(newRangeFrom);
    expect(alertSearchBarStateContainer.get().rangeFrom).toBe(newRangeFrom);
  });

  it('should update rangeTo using setRangeTo', () => {
    const newRangeTo = 'now-1h';
    alertSearchBarStateContainer.transitions.setRangeTo(newRangeTo);
    expect(alertSearchBarStateContainer.get().rangeTo).toBe(newRangeTo);
  });

  it('should update kuery using setKuery', () => {
    const newKuery = 'host.name: "test-host"';
    alertSearchBarStateContainer.transitions.setKuery(newKuery);
    expect(alertSearchBarStateContainer.get().kuery).toBe(newKuery);
  });

  it('should update status using setStatus', () => {
    const newStatus: AlertStatus = 'active';
    alertSearchBarStateContainer.transitions.setStatus(newStatus);
    expect(alertSearchBarStateContainer.get().status).toBe(newStatus);
  });

  it('should update filters using setFilters', () => {
    const newFilters: Filter[] = [
      {
        meta: { alias: null, disabled: false, negate: false, key: 'host.name', value: 'test-host' },
        query: { match_phrase: { 'host.name': 'test-host' } },
      },
    ];
    alertSearchBarStateContainer.transitions.setFilters(newFilters);
    expect(alertSearchBarStateContainer.get().filters).toEqual(newFilters);
  });

  it('should update savedQueryId using setSavedQueryId', () => {
    const newSavedQueryId = 'test-query-id';
    alertSearchBarStateContainer.transitions.setSavedQueryId(newSavedQueryId);
    expect(alertSearchBarStateContainer.get().savedQueryId).toBe(newSavedQueryId);
  });

  it('should update controlConfigs using setControlConfigs', () => {
    const newControlConfigs: FilterControlConfig[] = [{ field_name: 'host.name' }];
    alertSearchBarStateContainer.transitions.setControlConfigs(newControlConfigs);
    expect(alertSearchBarStateContainer.get().controlConfigs).toEqual(newControlConfigs);
  });

  it('should update groupings using setGroupings', () => {
    const newGroupings = ['group1', 'group2'];
    alertSearchBarStateContainer.transitions.setGroupings(newGroupings);
    expect(alertSearchBarStateContainer.get().groupings).toEqual(newGroupings);
  });
});
