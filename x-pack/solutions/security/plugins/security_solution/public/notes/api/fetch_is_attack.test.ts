/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { KibanaServices } from '../../common/lib/kibana';
import { fetchIsAttack, getAttackIndexPattern } from './fetch_is_attack';

jest.mock('../../common/lib/kibana');

const mockSearch = jest.fn();

describe('getAttackIndexPattern', () => {
  it('should return the scheduled and adhoc attack indices of the space', () => {
    expect(getAttackIndexPattern('my-space')).toBe(
      '.alerts-security.attack.discovery.alerts-my-space,.adhoc.alerts-security.attack.discovery.alerts-my-space'
    );
  });
});

describe('fetchIsAttack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (KibanaServices.get as jest.Mock).mockReturnValue({ data: { search: { search: mockSearch } } });
  });

  it('should search the attack indices of the space for the id, without fetching any field', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { hits: [] } } }));

    await fetchIsAttack({ eventId: 'id', spaceId: 'my-space' });

    expect(mockSearch).toHaveBeenCalledWith({
      params: {
        index:
          '.alerts-security.attack.discovery.alerts-my-space,.adhoc.alerts-security.attack.discovery.alerts-my-space',
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 1,
        _source: false,
        terminate_after: 1,
        track_total_hits: false,
        query: { ids: { values: ['id'] } },
      },
    });
  });

  it('should return true when the id is an attack', async () => {
    mockSearch.mockReturnValue(
      of({ rawResponse: { hits: { hits: [{ _id: 'id', _index: 'attack-index' }] } } })
    );

    expect(await fetchIsAttack({ eventId: 'id', spaceId: 'default' })).toBe(true);
  });

  it('should return false when the id is not an attack', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { hits: [] } } }));

    expect(await fetchIsAttack({ eventId: 'id', spaceId: 'default' })).toBe(false);
  });
});
