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
      
      // Initialize resource container.
      ctx.resource = [:];
      ctx.resource.attributes = [:];

      // List of resource attribute paths as arrays.
      def resourceAttributes = [
        ["agent", "build", "original"],
        ["agent", "ephemeral_id"],
        ["agent", "id"],
        ["agent", "name"],
        ["agent", "type"],
        ["agent", "version"],
        ["cloud", "account", "id"],
        ["cloud", "account", "name"],
        ["cloud", "availability_zone"],
        ["cloud", "instance", "id"],
        ["cloud", "instance", "name"],
        ["cloud", "machine", "type"],
        ["cloud", "project", "id"],
        ["cloud", "project", "name"],
        ["cloud", "provider"],
        ["cloud", "region"],
        ["cloud", "service", "name"],
        ["host", "architecture"],
        ["host", "domain"],
        ["host", "geo", "city_name"],
        ["host", "geo", "continent_code"],
        ["host", "geo", "continent_name"],
        ["host", "geo", "country_iso_code"],
        ["host", "geo", "country_name"],
        ["host", "geo", "location"],
        ["host", "geo", "name"],
        ["host", "geo", "postal_code"],
        ["host", "geo", "region_iso_code"],
        ["host", "geo", "region_name"],
        ["host", "geo", "timezone"],
        ["host", "hostname"],
        ["host", "id"],
        ["host", "ip"],
        ["host", "mac"],
        ["host", "name"],
        ["host", "os", "family"],
        ["host", "os", "full"],
        ["host", "os", "kernel"],
        ["host", "os", "name"],
        ["host", "os", "platform"],
        ["host", "os", "type"],
        ["host", "os", "version"],
        ["host", "type"]
      ];

      // Process each resource attribute.
      for (def resPath : resourceAttributes) {
        // Build the full dotted key.
        def fullKey = "";
        for (int i = 0; i < resPath.length; i++) {
          if (i > 0) {
            fullKey += ".";
          }
          fullKey += resPath[i];
        }
        
        // Attempt to locate the attribute via nested maps.
        def current = ctx;
        boolean valid = true;
        for (int i = 0; i < resPath.length - 1; i++) {
          if (current[resPath[i]] == null || !(current[resPath[i]] instanceof Map)) {
            valid = false;
            break;
          }
          current = current[resPath[i]];
        }
        // If the nested structure exists and the final key is not null, move its value.
        if (valid && current[resPath[resPath.length - 1]] != null) {
          ctx.resource.attributes[fullKey] = current[resPath[resPath.length - 1]];
          current.remove(resPath[resPath.length - 1]);
        }
        
        // Also check if the attribute exists as a top-level key (using the dotted key).
        if (ctx.containsKey(fullKey) && ctx[fullKey] != null) {
          ctx.resource.attributes[fullKey] = ctx[fullKey];
          ctx.remove(fullKey);
        }
      }

      // Process the "message" field.
      if (ctx.message != null) {
        ctx.body = [:];
        ctx.body.text = ctx.message;
        ctx.remove("message");
      }

      // Process "log.level" field.
      if (ctx.log?.level != null) {
        ctx.severity_text = ctx.log.level;
        ctx.log.remove("level");
      }

      // Collect any remaining keys into ctx.attributes (except reserved ones) and remove them.
      ctx.attributes = [:];
      def keysToRemove = [];
      for (entry in ctx.entrySet()) {
        if (entry.getKey() != "@timestamp" &&
            entry.getKey() != "resource" &&
            !entry.getKey().startsWith("_") &&
            entry.getKey() != "severity_text" &&
            entry.getKey() != "attributes" &&
            entry.getKey() != "body") {
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
      path: 'resource.attributes',
      field: '*',
      ignore_failure: true,
    },
  },
  {
    dot_expander: {
      path: 'attributes',
      field: '*',
      ignore_failure: true,
    },
  },
];
