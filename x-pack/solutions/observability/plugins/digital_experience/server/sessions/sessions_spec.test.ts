/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
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

  it('only summarizes events that carry both service.name and session.id', () => {
    expect(transform.source.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        { exists: { field: SOURCE_SESSION_ID_FIELD } },
        { exists: { field: SOURCE_SERVICE_NAME_FIELD } },
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
        'client_seen',
        ...WEB_VITAL_NAMES,
      ])
    );
    expect(aggregations.pages.aggs?.latest.top_metrics?.metrics).toEqual({
      field: SOURCE_URL_FIELD,
    });
    expect(aggregations.user_seen.aggs?.latest.top_metrics?.metrics).toEqual(
      SESSION_ATTRIBUTE_FIELDS.user.map((field) => ({ field }))
    );
  });

  it('stamps managed_by and version so setup and health checks can find it', () => {
    const meta = { managed_by: SESSIONS_MANAGED_BY, version: SESSIONS_VERSION };
    expect(transform._meta).toEqual(meta);
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

  it('passes candidate fields to the dest pipeline script as params', () => {
    const script = sessionsDestPipeline.processors?.[0]?.script;
    expect(script?.params).toEqual({
      fields: SESSION_ATTRIBUTE_FIELDS,
      vitals: [...WEB_VITAL_NAMES],
    });
    expect(script?.source).toContain(`metrics['${SOURCE_URL_FIELD}']`);
  });
});
