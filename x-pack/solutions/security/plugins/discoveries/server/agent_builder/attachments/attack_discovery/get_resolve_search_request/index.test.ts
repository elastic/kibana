/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResolveSearchRequest } from '.';

const ADHOC_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-space-a';

const request = getResolveSearchRequest({
  adhocIndex: ADHOC_INDEX,
  origin: 'discovery-1',
  spaceId: 'space-a',
});

describe('getResolveSearchRequest', () => {
  it('searches the scheduled index of the space', () => {
    expect(request.index).toContain('.alerts-security.attack.discovery.alerts-space-a');
  });

  it('searches the ad-hoc index', () => {
    expect(request.index).toContain(ADHOC_INDEX);
  });

  it('tolerates a space where one of the indices does not exist yet', () => {
    expect(request).toEqual(
      expect.objectContaining({ allow_no_indices: true, ignore_unavailable: true })
    );
  });

  it('matches the origin by document id or by kibana.alert.uuid', () => {
    expect(request.query).toEqual({
      bool: {
        minimum_should_match: 1,
        should: [
          { ids: { values: ['discovery-1'] } },
          { term: { 'kibana.alert.uuid': 'discovery-1' } },
        ],
      },
    });
  });

  it('returns at most one discovery', () => {
    expect(request.size).toBe(1);
  });
});
