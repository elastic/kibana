/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORE_WEB_VITALS } from '../../common/core_web_vitals';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_MANAGED_BY,
  SESSIONS_VERSION,
} from '../../common/sessions';
import { sessionsIndexMappings, sessionsIndexTemplate } from './sessions_spec';

describe('sessions index template', () => {
  it('covers the sessions indices of every version', () => {
    expect(sessionsIndexTemplate.name).toBe(SESSIONS_INDEX_TEMPLATE_NAME);
    expect(sessionsIndexTemplate.index_patterns).toEqual([SESSIONS_INDEX_PATTERN]);
  });

  it('is marked managed and stamped with the version', () => {
    expect(sessionsIndexTemplate._meta).toEqual({
      managed: true,
      managed_by: SESSIONS_MANAGED_BY,
      version: SESSIONS_VERSION,
    });
  });

  it('sorts the index by start time, newest first', () => {
    expect(sessionsIndexTemplate.template?.settings).toEqual({
      'index.sort.field': ['start_time', 'session.id'],
      'index.sort.order': ['desc', 'asc'],
    });
  });

  it('maps every field the readers use', () => {
    expect(sessionsIndexTemplate.template?.mappings).toBe(sessionsIndexMappings);
    expect(sessionsIndexMappings.dynamic).toBe(false);
    expect(Object.keys(sessionsIndexMappings.properties)).toEqual(
      expect.arrayContaining([
        'session',
        'service',
        'start_time',
        'end_time',
        'duration_ms',
        'bounced',
        'has_error',
        'entry_page',
        'exit_page',
        'journey',
        'environment',
        'page_load_count',
        'js_error_count',
        'http_request_count',
        'http_failed_request_count',
        'user',
        'user_agent',
        'geo',
        'web_vitals',
        'web_vital_samples',
      ])
    );
  });

  it('maps the samples of every web vital by rating', () => {
    for (const vital of CORE_WEB_VITALS) {
      expect(
        Object.keys(sessionsIndexMappings.properties.web_vital_samples.properties[vital].properties)
      ).toEqual(['count', 'good', 'needs_improvement', 'poor']);
      expect(sessionsIndexMappings.properties.web_vitals.properties[vital]).toEqual({
        type: 'double',
      });
    }
  });
});
