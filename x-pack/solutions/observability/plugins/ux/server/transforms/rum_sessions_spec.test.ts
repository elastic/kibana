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
});

describe('rumNormalizePipeline', () => {
  it('only stamps missing fields', () => {
    const source = rumNormalizePipeline.processors[0].script.source;
    expect(source).toContain("r['session.id'] == null");
    expect(source).toContain("a['user.key'] == null");
    expect(source).not.toContain('ctx.remove');
  });
});
