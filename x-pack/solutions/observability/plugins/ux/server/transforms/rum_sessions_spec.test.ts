/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RUM_CANONICAL_SERVICE_NAME_FIELD,
  RUM_CANONICAL_SESSION_ID_FIELD,
} from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import {
  buildRumSessionsTransformBody,
  rumNormalizePipeline,
  rumSessionsTransformBody,
} from './rum_sessions_spec';

describe('rumSessionsTransformBody', () => {
  it('groups by canonical keyword fields instead of Painless scripts', () => {
    const { group_by: groupBy } = rumSessionsTransformBody.pivot;
    expect(groupBy['session.id']).toEqual({
      terms: { field: RUM_CANONICAL_SESSION_ID_FIELD },
    });
    expect(groupBy['service.name']).toEqual({
      terms: { field: RUM_CANONICAL_SERVICE_NAME_FIELD },
    });
  });

  it('defaults sync delay to 5m and accepts an override', () => {
    expect(rumSessionsTransformBody.sync.time.delay).toBe('5m');
    expect(buildRumSessionsTransformBody('1m').sync.time.delay).toBe('1m');
  });

  it('keeps 90d of session history for long-range analytics', () => {
    expect(rumSessionsTransformBody.source.query.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 'now-90d' } },
    });
    expect(rumSessionsTransformBody.retention_policy.time.max_age).toBe('93d');
  });

  it('reads has_replay from RUM attributes and does not scan replay streams', () => {
    expect(rumSessionsTransformBody.source.index).toEqual([RUM_SESSION_SOURCE_INDEX]);
    expect(rumSessionsTransformBody.pivot.aggregations.has_replay).toEqual({
      filter: { term: { 'attributes.rum.has_replay': true } },
    });
    expect(rumSessionsTransformBody.pivot.aggregations).not.toHaveProperty('replay_event_count');
  });
});

describe('rumNormalizePipeline', () => {
  it('only stamps missing fields', () => {
    const source = rumNormalizePipeline.processors[0].script.source;
    expect(source).toContain("r['session.id'] == null");
    expect(source).toContain("a['user.key'] == null");
    expect(source).toContain("a['rum.has_replay'] == null");
    expect(source).not.toContain('ctx.remove');
  });
});
