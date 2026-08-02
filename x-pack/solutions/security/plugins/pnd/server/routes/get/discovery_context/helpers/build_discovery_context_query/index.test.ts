/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDiscoveryContextQuery,
  PND_DISCOVERY_CONTEXT_ENTITY_FIELDS,
  PND_DISCOVERY_CONTEXT_TERMS_SIZE,
} from '.';

const alertIdsByDiscoveryId = { 'ad-1': ['alert-1', 'alert-2'], 'ad-2': ['alert-3'] };
const spaceId = 'agent-3';

/** `maxItems` on `PndDiscoveryContext.entities` in `@kbn/pnd-common`. */
const CONTRACT_MAX_ENTITIES = 100;

const query = () => buildDiscoveryContextQuery({ alertIdsByDiscoveryId, spaceId });

describe('buildDiscoveryContextQuery', () => {
  it("reads the request space's detection alerts index", () => {
    expect(query().index).toEqual('.alerts-security.alerts-agent-3');
  });

  it('reads aggregation-only, so no alert content leaves the server', () => {
    expect(query().size).toEqual(0);
  });

  it('tolerates a space whose detection alerts index does not exist yet', () => {
    expect(query().ignore_unavailable).toBe(true);
  });

  /**
   * The whole point of the `filters` aggregation: N discoveries resolve in ONE round trip, so
   * adding a proposal to the queue never adds a search.
   */
  it('resolves every discovery in a single search', () => {
    expect(Object.keys(query().aggs?.by_discovery?.filters?.filters ?? {})).toEqual([
      'ad-1',
      'ad-2',
    ]);
  });

  it("keys each filter on the discovery's own constituent alert ids", () => {
    expect(query().aggs?.by_discovery?.filters?.filters).toEqual({
      'ad-1': { ids: { values: ['alert-1', 'alert-2'] } },
      'ad-2': { ids: { values: ['alert-3'] } },
    });
  });

  it.each(PND_DISCOVERY_CONTEXT_ENTITY_FIELDS)(
    'aggregates the $field entity terms as $aggName',
    ({ aggName, field }) => {
      expect(query().aggs?.by_discovery?.aggs?.[aggName]).toEqual({
        terms: { field, size: PND_DISCOVERY_CONTEXT_TERMS_SIZE },
      });
    }
  );

  /**
   * D5: the MAX of the constituent alerts' own scores, which is naturally 0-100 — never the
   * Attack Discovery's `risk_score`, an unbounded sum that reaches four digits in production.
   */
  it("takes the risk score from the constituent alerts' kibana.alert.risk_score", () => {
    expect(query().aggs?.by_discovery?.aggs?.max_risk_score).toEqual({
      max: { field: 'kibana.alert.risk_score' },
    });
  });

  /**
   * The contract bounds `entities` at 100 per context. Nothing trims the response, so the bound
   * has to hold here, in the query that produces it.
   */
  it('cannot emit more entities than the response contract allows', () => {
    expect(
      PND_DISCOVERY_CONTEXT_ENTITY_FIELDS.length * PND_DISCOVERY_CONTEXT_TERMS_SIZE
    ).toBeLessThanOrEqual(CONTRACT_MAX_ENTITIES);
  });

  it('does not track total hits, which nothing reads', () => {
    expect(query().track_total_hits).toBe(false);
  });

  it('builds no filters at all for no discoveries', () => {
    expect(
      buildDiscoveryContextQuery({ alertIdsByDiscoveryId: {}, spaceId }).aggs?.by_discovery?.filters
        ?.filters
    ).toEqual({});
  });
});
