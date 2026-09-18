/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { pickEntityHit } from './pick_entity_hit';

const hit = (index: string, id: string): estypes.SearchHit<unknown> =>
  ({
    _index: index,
    _id: id,
    _source: { process: { entity_id: id } },
  } as estypes.SearchHit<unknown>);

describe('pickEntityHit', () => {
  it('returns undefined when there are no hits', () => {
    expect(pickEntityHit([])).toBeUndefined();
  });

  it('returns the first hit when no preferred index is given', () => {
    const first = hit('origin-index', 'a');
    const second = hit('linked-project:origin-index', 'b');

    expect(pickEntityHit([first, second])).toBe(first);
  });

  it('prefers an exact project-qualified _index match', () => {
    const origin = hit('logs-endpoint.events-default', 'same-id');
    const linked = hit('linked-project:logs-endpoint.events-default', 'same-id');

    expect(pickEntityHit([origin, linked], 'linked-project:logs-endpoint.events-default')).toBe(
      linked
    );
  });

  it('falls back to matching the local index name', () => {
    const linked = hit('linked-project:logs-endpoint.events-default', 'same-id');
    const other = hit('metrics-other', 'same-id');

    expect(pickEntityHit([other, linked], 'logs-endpoint.events-default')).toBe(linked);
  });
});
