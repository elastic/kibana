/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pipeline } from './pipeline';

export const tiAbusechUrl: Pipeline = {
  name: 'logs-ti_abusech.url-1.3.1',
  processors: [
    {
      set: {
        field: 'ecs.version',
        value: '8.0.0',
      },
    },
    {
      set: {
        field: 'event.kind',
        value: 'enrichment',
      },
    },
    {
      set: {
        field: 'event.category',
        value: 'threat',
      },
    },
    {
      set: {
        field: 'event.type',
        value: 'indicator',
      },
    },
    {
      rename: {
        field: 'message',
        target_field: 'event.original',
        ignore_missing: true,
      },
    },
    {
      json: {
        field: 'event.original',
        target_field: 'abusech.url',
      },
    },
    {
      fingerprint: {
        fields: ['abusech.url.id'],
        target_field: '_id',
      },
    },
    {
      set: {
        field: 'threat.indicator.type',
        value: 'url',
      },
    },
    {
      date: {
        field: 'abusech.url.date_added',
        target_field: 'threat.indicator.first_seen',
        formats: ['yyyy-MM-dd HH:mm:ss z', 'yyyy-MM-dd HH:mm:ss Z'],
        if: 'ctx.abusech?.url?.date_added != null',
      },
    },
    {
      uri_parts: {
        field: 'abusech.url.url',
        target_field: 'threat.indicator.url',
        keep_original: true,
        remove_if_successful: true,
      },
    },
    {
      set: {
        field: 'threat.indicator.url.full',
        value: '{{{threat.indicator.url.original}}}',
        ignore_empty_value: true,
      },
    },
    {
      rename: {
        field: 'abusech.url.urlhaus_reference',
        target_field: 'threat.indicator.reference',
        ignore_missing: true,
      },
    },
    {
      grok: {
        field: 'abusech.url.host',
        patterns: ['(?:%{IP:threat.indicator.ip}|%{GREEDYDATA:threat.indicator.url.domain})'],
        ignore_failure: true,
      },
    },
    {
      rename: {
        field: 'abusech.url.reporter',
        target_field: 'threat.indicator.provider',
        ignore_missing: true,
      },
    },
    {
      set: {
        field: 'threat.indicator.type',
        value: 'unknown',
        if: 'ctx?.threat?.indicator?.type == null',
      },
    },
    {
      convert: {
        field: 'abusech.url.larted',
        type: 'boolean',
        ignore_missing: true,
      },
    },
    {
      script: {
        lang: 'painless',
        if: 'ctx?.abusech != null',
        source:
          'void handleMap(Map map) {\n  for (def x : map.values()) {\n    if (x instanceof Map) {\n        handleMap(x);\n    } else if (x instanceof List) {\n        handleList(x);\n    }\n  }\nmap.values().removeIf(v -> v == null);\n}\nvoid handleList(List list) {\n  for (def x : list) {\n      if (x instanceof Map) {\n          handleMap(x);\n      } else if (x instanceof List) {\n          handleList(x);\n      }\n  }\n}\nhandleMap(ctx);\n',
      },
    },
    {
      remove: {
        field: 'event.original',
        if: "ctx?.tags == null || !(ctx.tags.contains('preserve_original_event'))",
        ignore_failure: true,
        ignore_missing: true,
      },
    },
    {
      remove: {
        field: ['abusech.url.date_added', 'abusech.url.url', 'abusech.url.host', 'message'],
        ignore_missing: true,
      },
    },
  ],
  on_failure: [
    {
      set: {
        field: 'error.message',
        value: '{{ _ingest.on_failure_message }}',
      },
    },
  ],
};
