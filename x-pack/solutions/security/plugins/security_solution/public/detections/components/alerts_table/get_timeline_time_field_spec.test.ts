/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getTimelineTimeFieldSpec } from './get_timeline_time_field_spec';

const buildAlert = (parameters: Record<string, unknown>, timestampOverride?: string): Ecs =>
  ({
    _id: 'alert-id',
    kibana: {
      alert: {
        rule: {
          parameters,
          ...(timestampOverride ? { timestamp_override: timestampOverride } : {}),
        },
      },
    },
  } as unknown as Ecs);

describe('getTimelineTimeFieldSpec', () => {
  it('returns undefined when the rule has no timestamp override', () => {
    expect(getTimelineTimeFieldSpec(buildAlert({}))).toBeUndefined();
  });

  it('returns undefined when the timestamp override is @timestamp', () => {
    expect(
      getTimelineTimeFieldSpec(buildAlert({ timestamp_override: '@timestamp' }))
    ).toBeUndefined();
  });

  it('returns a runtime field that falls back to @timestamp', () => {
    expect(getTimelineTimeFieldSpec(buildAlert({ timestamp_override: 'event.ingested' }))).toEqual({
      timeFieldName: 'kibana.combined_timestamp',
      runtimeFieldMap: {
        'kibana.combined_timestamp': {
          type: 'date',
          script: {
            source:
              'if (doc.containsKey("event.ingested") && doc["event.ingested"].size() != 0) { emit(doc["event.ingested"].value.toInstant().toEpochMilli()); } else if (doc.containsKey("@timestamp") && doc["@timestamp"].size() != 0) { emit(doc["@timestamp"].value.toInstant().toEpochMilli()); }',
          },
        },
      },
    });
  });

  it('reads the override from the alert rule field when parameters do not include it', () => {
    expect(getTimelineTimeFieldSpec(buildAlert({}, 'event.ingested'))?.timeFieldName).toBe(
      'kibana.combined_timestamp'
    );
  });

  it('uses the override field directly when the fallback is disabled', () => {
    expect(
      getTimelineTimeFieldSpec(
        buildAlert({
          timestamp_override: 'event.ingested',
          timestamp_override_fallback_disabled: true,
        })
      )
    ).toEqual({ timeFieldName: 'event.ingested' });
  });

  it('escapes the override field name in the runtime script', () => {
    const source = getTimelineTimeFieldSpec(buildAlert({ timestamp_override: 'my"field\\' }))
      ?.runtimeFieldMap?.['kibana.combined_timestamp'].script?.source;

    expect(source).toContain('doc.containsKey("my\\"field\\\\")');
  });
});
