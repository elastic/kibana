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
          { entity_id: 'user:a', alert_sources: [{ source: 'okta', alerts: 3 }] },
          { entity_id: 'user:ghost', alert_sources: [{ source: 'okta', alerts: 2 }] },
        ],
        entities
      )
    ).toEqual({ okta: { scored: 3, unmatched: 2 } });
  });

  it('gives each source only its own alerts when an entity has several sources', () => {
    expect(
      tallyAlertSources(
        [
          {
            entity_id: 'user:a',
            alert_sources: [
              { source: 'okta', alerts: 9 },
              { source: 'azure', alerts: 1 },
            ],
          },
        ],
        entities
      )
    ).toEqual({
      okta: { scored: 9, unmatched: 0 },
      azure: { scored: 1, unmatched: 0 },
    });
  });

  it('ignores scores without sources', () => {
    expect(tallyAlertSources([{ entity_id: 'user:a' }], entities)).toEqual({});
  });

  it('does not treat names like __proto__ or constructor specially', () => {
    const counts = tallyAlertSources(
      [
        {
          entity_id: 'user:a',
          alert_sources: [
            { source: '__proto__', alerts: 1 },
            { source: 'constructor', alerts: 1 },
          ],
        },
      ],
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
