/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SloListLocatorDefinition } from './slo_list';

describe('SloListLocator', () => {
  const locator = new SloListLocatorDefinition();

  it("returns the correct url with the default search state when no 'kqlQuery' provided", async () => {
    const location = await locator.getLocation({});
    expect(location.app).toEqual('slo');
    expect(location.path).toMatchInlineSnapshot(
      `"/?search=(filters:!(),groupBy:ungrouped,kqlQuery:'',lastRefresh:0,page:0,perPage:25,sort:(by:status,direction:desc),view:cardView)"`
    );
  });

  it("returns the correct url with the 'kqlQuery' provided", async () => {
    const location = await locator.getLocation({
      kqlQuery: 'slo.name: "Service Availability" and slo.indicator.type : "sli.kql.custom"',
    });
    expect(location.app).toEqual('slo');
    expect(location.path).toMatchInlineSnapshot(
      `"/?search=(filters:!(),groupBy:ungrouped,kqlQuery:'slo.name:%20%22Service%20Availability%22%20and%20slo.indicator.type%20:%20%22sli.kql.custom%22',lastRefresh:0,page:0,perPage:25,sort:(by:status,direction:desc),view:cardView)"`
    );
  });

  it("returns the correct url with 'filters' provided", async () => {
    const location = await locator.getLocation({
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'slo.indicator.type',
            negate: false,
            params: ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionDuration' } },
                { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionErrorRate' } },
              ],
            },
          },
        },
      ],
    });
    expect(location.app).toEqual('slo');
    expect(location.path).toContain('filters:!((meta:');
    expect(location.path).toContain('slo.indicator.type');
  });

  it("returns the correct url with both 'kqlQuery' and 'filters' provided", async () => {
    const location = await locator.getLocation({
      kqlQuery: 'slo.name: "Test SLO"',
      filters: [
        {
          meta: { key: 'slo.indicator.type' },
          query: { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionDuration' } },
        },
      ],
    });
    expect(location.app).toEqual('slo');
    expect(location.path).toContain("kqlQuery:'slo.name");
    expect(location.path).toContain('filters:!((meta:');
  });
});
