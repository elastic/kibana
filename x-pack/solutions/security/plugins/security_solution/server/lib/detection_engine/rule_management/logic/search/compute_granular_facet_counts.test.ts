/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { GranularRulesFacetCategory } from '../../../../../../common/api/detection_engine/rule_management/granular_rules_contract.gen';
import { computeGranularFacetCounts } from './compute_granular_facet_counts';

describe('computeGranularFacetCounts', () => {
  const aggregate = jest.fn();

  const rulesClient = {
    aggregate,
  } as unknown as RulesClient;

  beforeEach(() => {
    aggregate.mockReset();
  });

  it('returns an empty object and skips aggregate when no categories are requested', async () => {
    await expect(
      computeGranularFacetCounts({
        rulesClient,
        filter: 'enabled: true',
        ruleIds: undefined,
        categories: [],
      })
    ).resolves.toEqual({});

    expect(aggregate).not.toHaveBeenCalled();
  });

  it('maps friendly facet names to ES fields, passes the enriched filter to aggregate, and flattens buckets into count maps', async () => {
    aggregate.mockResolvedValue({
      facet_tags: { buckets: [{ key: 'tag1', doc_count: 3 }] },
      facet_enabled: {
        buckets: [
          { key: true, doc_count: 1 },
          { key: false, doc_count: 0 },
        ],
      },
    });

    const counts = await computeGranularFacetCounts({
      rulesClient,
      filter: 'some-filter',
      ruleIds: undefined,
      categories: ['tags', 'enabled'],
    });

    expect(counts).toEqual({
      tags: { tag1: 3 },
      enabled: { true: 1, false: 0 },
    });

    expect(aggregate).toHaveBeenCalledWith({
      options: {
        filter:
          '(alert.attributes.alertTypeId: siem.eqlRule OR alert.attributes.alertTypeId: siem.esqlRule OR alert.attributes.alertTypeId: siem.mlRule OR alert.attributes.alertTypeId: siem.queryRule OR alert.attributes.alertTypeId: siem.savedQueryRule OR alert.attributes.alertTypeId: siem.indicatorRule OR alert.attributes.alertTypeId: siem.thresholdRule OR alert.attributes.alertTypeId: siem.newTermsRule) AND (some-filter)',
      },
      aggs: {
        facet_tags: { terms: { field: 'alert.attributes.tags' } },
        facet_enabled: { terms: { field: 'alert.attributes.enabled' } },
      },
    });
  });

  it('uses the category string as the terms field when it already starts with alert.attributes.', async () => {
    const rawPath = 'alert.attributes.name';
    aggregate.mockResolvedValue({
      [`facet_${rawPath}`]: { buckets: [{ key: 'Rule A', doc_count: 5 }] },
    });

    const counts = await computeGranularFacetCounts({
      rulesClient,
      filter: undefined,
      ruleIds: undefined,
      categories: [rawPath as unknown as GranularRulesFacetCategory],
    });

    expect(counts).toEqual({
      [rawPath]: { 'Rule A': 5 },
    });

    expect(aggregate).toHaveBeenCalledWith({
      options: {
        filter:
          'alert.attributes.alertTypeId: siem.eqlRule OR alert.attributes.alertTypeId: siem.esqlRule OR alert.attributes.alertTypeId: siem.mlRule OR alert.attributes.alertTypeId: siem.queryRule OR alert.attributes.alertTypeId: siem.savedQueryRule OR alert.attributes.alertTypeId: siem.indicatorRule OR alert.attributes.alertTypeId: siem.thresholdRule OR alert.attributes.alertTypeId: siem.newTermsRule',
      },
      aggs: {
        [`facet_${rawPath}`]: { terms: { field: rawPath } },
      },
    });
  });
});
