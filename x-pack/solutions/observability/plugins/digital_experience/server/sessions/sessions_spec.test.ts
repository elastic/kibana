/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MAX_PAGE_SEARCH_SIZE,
  SESSIONS_JOURNEY_SIZE,
  SESSIONS_JOURNEY_URL_CANDIDATES,
  SESSIONS_MANAGED_BY,
  SESSIONS_PIPELINE_NAME,
  SESSIONS_TRANSFORM_ID,
  SESSIONS_VERSION,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
  WEB_VITAL_NAMES,
} from '../../common/sessions';
import {
  SESSION_ATTRIBUTE_FIELDS,
  SESSION_ATTRIBUTE_GROUPS,
  buildSessionsTransform,
  sessionsDestPipeline,
  sessionsIndexMappings,
  sessionsIndexTemplate,
} from './sessions_spec';

describe('sessions transform spec', () => {
  const transform = buildSessionsTransform();

  it('reads OTel traces and logs and writes through the dest pipeline', () => {
    expect(transform.transform_id).toBe(SESSIONS_TRANSFORM_ID);
    expect(transform.source.index).toEqual(['traces-*.otel-*', 'logs-*.otel-*']);
    expect(transform.dest).toEqual({ index: SESSIONS_INDEX, pipeline: SESSIONS_PIPELINE_NAME });
    expect(transform.sync?.time?.field).toBe('@timestamp');
    expect(transform.retention_policy?.time?.field).toBe('end_time');
  });

  it('uses the default frequency and a 5000 page size', () => {
    expect(transform.frequency).toBe('1m');
    expect(transform.settings?.max_page_search_size).toBe(SESSIONS_MAX_PAGE_SEARCH_SIZE);
    expect(SESSIONS_MAX_PAGE_SEARCH_SIZE).toBe(5000);
    expect(buildSessionsTransform({ frequency: '5m' }).frequency).toBe('5m');
  });

  it('builds partitions that split session ids and share the dest index', () => {
    const partitions = [0, 1, 2, 3].map((index) =>
      buildSessionsTransform({ partition: { index, count: 4 } })
    );

    expect(partitions.map(({ transform_id: id }) => id)).toEqual([
      `${SESSIONS_TRANSFORM_ID}-p0of4`,
      `${SESSIONS_TRANSFORM_ID}-p1of4`,
      `${SESSIONS_TRANSFORM_ID}-p2of4`,
      `${SESSIONS_TRANSFORM_ID}-p3of4`,
    ]);
    expect(partitions.map(({ source }) => source.query?.bool?.filter)).toEqual(
      [{ lt: '40' }, { gte: '40', lt: '80' }, { gte: '80', lt: 'c0' }, { gte: 'c0' }].map((range) =>
        expect.arrayContaining([{ range: { [SOURCE_SESSION_ID_FIELD]: range } }])
      )
    );
    expect(new Set(partitions.map(({ dest }) => dest.index))).toEqual(new Set([SESSIONS_INDEX]));
    // Each partition prunes the shared dest index, so no slice depends on another's traffic.
    expect(partitions.map(({ retention_policy: retention }) => retention?.time?.field)).toEqual([
      'end_time',
      'end_time',
      'end_time',
      'end_time',
    ]);
    expect(partitions[2]._meta).toEqual(expect.objectContaining({ partition: 2, partitions: 4 }));
  });

  it('adds no session id filter for a single partition', () => {
    expect(JSON.stringify(transform.source.query)).not.toContain(
      '"range":{"attributes.session.id"'
    );
  });

  it('only summarizes browser events that carry a non-empty service.name and session.id', () => {
    expect(transform.source.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        { term: { 'telemetry.sdk.language': 'webjs' } },
        { exists: { field: SOURCE_SESSION_ID_FIELD } },
        { exists: { field: SOURCE_SERVICE_NAME_FIELD } },
      ])
    );
    expect(transform.source.query?.bool?.must_not).toEqual([
      { term: { [SOURCE_SESSION_ID_FIELD]: '' } },
      { term: { [SOURCE_SERVICE_NAME_FIELD]: '' } },
    ]);
  });

  it('matches web vital names in any case', () => {
    expect(transform.pivot?.aggregations?.lcp.filter?.bool?.filter).toEqual(
      expect.arrayContaining([
        { term: { 'attributes.browser.web_vital.name': { value: 'lcp', case_insensitive: true } } },
      ])
    );
  });

  it('groups by service.name and session.id', () => {
    expect(transform.pivot?.group_by).toEqual({
      'service.name': { terms: { field: SOURCE_SERVICE_NAME_FIELD } },
      'session.id': { terms: { field: SOURCE_SESSION_ID_FIELD } },
    });
  });

  it('aggregates timestamps, counts, journey, attributes and every web vital', () => {
    const aggregations = transform.pivot?.aggregations ?? {};
    expect(Object.keys(aggregations)).toEqual(
      expect.arrayContaining([
        'start_time',
        'end_time',
        'event_count',
        'page_view_count',
        'click_count',
        'error_count',
        'pages',
        'exit',
        'user_seen',
        'user_agent_seen',
        'geo_seen',
        ...WEB_VITAL_NAMES,
      ])
    );
    // url.full is a wildcard field in the OTel templates: terms works, top_metrics does not.
    expect(aggregations.pages.aggs?.urls.terms).toEqual({
      field: SOURCE_URL_FIELD,
      size: SESSIONS_JOURNEY_URL_CANDIDATES,
      order: { first: 'asc' },
    });
    expect(aggregations.exit.aggs?.urls.terms).toEqual({
      field: SOURCE_URL_FIELD,
      size: 1,
      order: { last: 'desc' },
    });
    expect(JSON.stringify(aggregations)).not.toContain('scripted_metric');
    expect(aggregations.user_seen.aggs?.latest.top_metrics?.metrics).toEqual(
      SESSION_ATTRIBUTE_FIELDS.user.map((field) => ({ field }))
    );
  });

  it('reads user, user agent and geo from their own latest event', () => {
    const aggregations = transform.pivot?.aggregations ?? {};
    for (const [name, fields] of Object.entries(SESSION_ATTRIBUTE_GROUPS)) {
      expect(aggregations[name].aggs?.latest.top_metrics?.metrics).toEqual(
        fields.map((field) => ({ field }))
      );
    }
    expect(SESSION_ATTRIBUTE_GROUPS.user_agent_seen).toContain('resource.attributes.browser.name');
    expect(SESSION_ATTRIBUTE_GROUPS.geo_seen).toContain('attributes.client.geo.country_iso_code');
  });

  it('stamps managed_by and version so setup and health checks can find it', () => {
    const meta = { managed: true, managed_by: SESSIONS_MANAGED_BY, version: SESSIONS_VERSION };
    expect(transform._meta).toEqual({ ...meta, partition: 0, partitions: 1 });
    expect(sessionsDestPipeline._meta).toEqual(meta);
    expect(sessionsIndexTemplate._meta).toEqual(meta);
  });

  it('maps every field the dest pipeline writes', () => {
    expect(sessionsIndexTemplate.index_patterns).toEqual([SESSIONS_INDEX_PATTERN]);
    expect(sessionsIndexTemplate.template?.mappings).toBe(sessionsIndexMappings);
    expect(Object.keys(sessionsIndexMappings.properties)).toEqual(
      expect.arrayContaining([
        'session',
        'service',
        'duration_ms',
        'bounced',
        'entry_page',
        'exit_page',
        'journey',
        'user',
        'user_agent',
        'geo',
        'web_vitals',
      ])
    );
  });

  it('indexes the session with the failure message when the dest pipeline fails', () => {
    const [setMessage, removeRaw] = sessionsDestPipeline.on_failure ?? [];
    expect(setMessage?.set?.field).toBe('error.message');
    expect(removeRaw?.remove?.field).toEqual(
      expect.arrayContaining(['page_view_count', 'pages', 'user_agent_seen', 'lcp'])
    );
    expect(sessionsIndexMappings.properties.error.properties.message.type).toBe('keyword');
  });

  it('passes candidate fields to the dest pipeline script as params', () => {
    const script = sessionsDestPipeline.processors?.[0]?.script;
    expect(script?.params).toEqual({
      fields: SESSION_ATTRIBUTE_FIELDS,
      vitals: [...WEB_VITAL_NAMES],
      journeySize: SESSIONS_JOURNEY_SIZE,
    });
  });
});
