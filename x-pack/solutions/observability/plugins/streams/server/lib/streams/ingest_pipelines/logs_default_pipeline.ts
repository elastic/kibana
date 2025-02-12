/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const logsDefaultPipelineProcessors = [
  {
    set: {
      description: "If '@timestamp' is missing, set it with the ingest timestamp",
      field: '@timestamp',
      override: false,
      copy_from: '_ingest.timestamp',
    },
  },
  {
    pipeline: {
      name: 'logs@json-pipeline',
      ignore_missing_pipeline: true,
    },
  },
  {
    dot_expander: {
      field: '*',
      ignore_failure: true,
    },
  },
  {
    script: {
      lang: 'painless',
      source: `
        if (ctx.resource?.attributes != null) return;
        ctx.resource = [:];
        ctx.resource.attributes = [:];
        if (ctx.host?.name != null) {
          ctx.resource.attributes['host.name'] = ctx.host.name;
          ctx.host.remove('name');
        }
        if (ctx['host.name'] != null) {
          ctx.resource.attributes['host.name'] = ctx['host.name'];
          ctx.remove('host.name');
        }
        if (ctx.message != null) {
          ctx['body'] = ctx.message;
          ctx.remove('message');
        }
        if (ctx.log?.level != null) {
          ctx.severity_text = ctx.log.level;
          ctx.log.remove('level');
        }
        ctx.attributes = [:];
        def keysToRemove = [];
        for (entry in ctx.entrySet()) {
          if (entry.getKey() != '@timestamp' && entry.getKey() != 'resource' && !entry.getKey().startsWith('_') && entry.getKey() != 'severity_text' && entry.getKey() != 'attributes' && entry.getKey() != 'resource' && entry.getKey() != 'body') {
            ctx.attributes[entry.getKey()] = entry.getValue();
            keysToRemove.add(entry.getKey());
          }
        }
        for (key in keysToRemove) {
          ctx.remove(key);
        }
      `,
    },
  },
  {
    dot_expander: {
      field: 'resource.attributes.*',
      path: 'resource.attributes',
      ignore_failure: true,
    },
  },
  {
    dot_expander: {
      field: 'attributes.*',
      path: 'attributes',
      ignore_failure: true,
    },
  },
];
