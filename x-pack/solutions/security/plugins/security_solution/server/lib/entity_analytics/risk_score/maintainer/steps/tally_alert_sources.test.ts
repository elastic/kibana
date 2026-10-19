/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeAlertSourceCounts, tallyAlertSources } from './tally_alert_sources';

describe('tallyAlertSources', () => {
  const entities = new Map([['user:a', {}]]);

  it('splits alerts by whether the entity is in the store', () => {
    expect(
      tallyAlertSources(
        [
          { entity_id: 'user:a', alert_count: 3, alert_sources: ['okta'] },
          { entity_id: 'user:ghost', alert_count: 2, alert_sources: ['okta'] },
        ],
        entities
      )
    ).toEqual({ okta: { scored: 3, unmatched: 2 } });
  });

  it('adds an entity with several sources to each of them', () => {
    expect(
      tallyAlertSources(
        [{ entity_id: 'user:a', alert_count: 4, alert_sources: ['okta', 'azure'] }],
        entities
      )
    ).toEqual({
      okta: { scored: 4, unmatched: 0 },
      azure: { scored: 4, unmatched: 0 },
    });
  });

  it('ignores scores without sources', () => {
    expect(tallyAlertSources([{ entity_id: 'user:a', alert_count: 4 }], entities)).toEqual({});
  });

  it('does not treat names like __proto__ or constructor specially', () => {
    const counts = tallyAlertSources(
      [{ entity_id: 'user:a', alert_count: 1, alert_sources: ['__proto__', 'constructor'] }],
      entities
    );

    expect(Object.keys(counts).sort()).toEqual(['__proto__', 'constructor']);
    expect(counts.constructor).toEqual({ scored: 1, unmatched: 0 });
  });
});

describe('mergeAlertSourceCounts', () => {
  it('adds the counts of a page to the run total', () => {
    const total = { okta: { scored: 1, unmatched: 1 } };

    mergeAlertSourceCounts(total, {
      okta: { scored: 2, unmatched: 0 },
      azure: { scored: 0, unmatched: 5 },
    });

    expect(total).toEqual({
      okta: { scored: 3, unmatched: 1 },
      azure: { scored: 0, unmatched: 5 },
    });
  });
});
