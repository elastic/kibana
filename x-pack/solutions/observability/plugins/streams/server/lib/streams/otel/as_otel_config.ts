/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition, WiredStreamDefinition } from '@kbn/streams-schema';
import fs from 'fs';
import path from 'path';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { getParentId, isRoot } from '../helpers/hierarchy';
import { otelPrefixes } from '../component_templates/otel_layer';

function sanitizePipelineName(name: string): string {
  return name.replace(/[\/.]/g, '_');
}

function getPipelineName(streamName: string): string {
  return `logs/${sanitizePipelineName(streamName)}`;
}

export function convertToOtelConfig(streams: WiredStreamDefinition[]) {
  const config: any = {
    receivers: {
      filelog: {
        include: ['/Users/joereuter/Downloads/otelcollector/testlogs/*.log'],
      },
    },
    processors: {},
    connectors: {},
    service: {
      pipelines: {},
    },
    exporters: {
      elasticsearch: {
        endpoints: ['http://localhost:9200'],
        api_key: process.env.ELASTIC_API_KEY,
        logs_index: 'logs',
        mapping: {
          mode: 'otel',
        },
      },
      debug: {
        verbosity: 'detailed',
      },
    },
  };

  // JSON parsing processor
  config.processors['transform/json_parsing'] = {
    error_mode: 'ignore',
    log_statements: [
      {
        context: 'log',
        conditions: ['body != nil and Substring(body, 0, 2) == "{"'],
        statements: [
          'set(cache, ParseJSON(body))',
          'flatten(cache, "")',
          'merge_maps(attributes, cache, "upsert")',
        ],
      },
    ],
  };

  // Filter streams that have otel processing or are descendants or ancestors of streams with otel processing
  const filteredStreams = streams.filter((stream) => {
    const hasOtelProcessing = (s: WiredStreamDefinition) =>
      s.stream.ingest.wired.otel_processing && s.stream.ingest.wired.otel_processing?.length > 0;

    return (
      isRoot(stream.name) ||
      hasOtelProcessing(stream) ||
      streams.some(
        (s) =>
          hasOtelProcessing(s) &&
          // Check if the stream is a child of the current stream or vice versa
          (stream.name.startsWith(`${s.name}.`) || s.name.startsWith(`${stream.name}.`))
      )
    );
  });

  config.service.pipelines[getPipelineName('output')] = {
    receivers: filteredStreams.map((stream) => `routing/${sanitizePipelineName(stream.name)}`),
    processors: [],
    exporters: ['elasticsearch', 'debug'],
  };

  filteredStreams.forEach((stream) => {
    const sanitizedStreamName = sanitizePipelineName(stream.name);
    let table = stream.stream.ingest.routing
      .filter((routing) => {
        return filteredStreams.some((s) => s.name === routing.name);
      })
      .map((routing) => ({
        context: 'log',
        condition: convertConditionToOttl(routing.condition),
        pipelines: [getPipelineName(routing.name)],
      }));
    if (table.length === 0) {
      // if there are no routing rules, route everything to the output pipeline.
      // there is probably a more elegant approach to do this, but it works for now.
      table = [
        {
          context: 'log',
          condition: 'true',
          pipelines: ['logs/output'],
        },
      ];
    }
    config.connectors[`routing/${sanitizedStreamName}`] = {
      match_once: true,
      default_pipelines: [getPipelineName('output')],

      table,
    };
    config.service.pipelines[getPipelineName(stream.name)] = {
      receivers: [
        isRoot(stream.name)
          ? 'filelog'
          : `routing/${sanitizePipelineName(getParentId(stream.name)!)}`,
      ],
      processors: [
        ...(isRoot(stream.name) ? ['transform/json_parsing'] : []),
        ...(stream.stream.ingest.wired.otel_processing?.map((processor, id) => {
          const [processorName] = Object.keys(processor);
          return `${processorName}/${sanitizedStreamName}_${id}`;
        }) ?? []),
        `transform/reroute_flag_${sanitizedStreamName}`,
      ],
      exporters: [`routing/${sanitizedStreamName}`],
    };

    stream.stream.ingest.wired.otel_processing?.forEach((processor, id) => {
      const [[processorName, processorConfig]] = Object.entries(processor);
      config.processors[`${processorName}/${sanitizedStreamName}_${id}`] = processorConfig;
    });
    config.processors[`transform/reroute_flag_${sanitizedStreamName}`] = {
      log_statements: [
        {
          context: 'log',
          statements: [`set(attributes["target_stream"], "${stream.name}")`],
        },
      ],
    };
  });

  // Write the config to a file
  const configFilePath = path.join('/tmp', 'otel.yaml');
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));

  return config;
}

function convertConditionToOttl(condition: Condition): string {
  if (!condition) {
    return '';
  }

  if ('and' in condition) {
    return `(${condition.and.map(convertConditionToOttl).join(' and ')})`;
  }

  if ('or' in condition) {
    return `(${condition.or.map(convertConditionToOttl).join(' or ')})`;
  }

  if ('field' in condition) {
    const field = fieldToOTTLGetter(condition.field);
    switch (condition.operator) {
      case 'eq':
        return `${field} == "${condition.value}"`;
      case 'neq':
        return `${field} != "${condition.value}"`;
      case 'lt':
        return `${field} < ${condition.value}`;
      case 'lte':
        return `${field} <= ${condition.value}`;
      case 'gt':
        return `${field} > ${condition.value}`;
      case 'gte':
        return `${field} >= ${condition.value}`;
      case 'contains':
        return `IsMatch(${field}, "${condition.value}")`;
      case 'startsWith':
        return `IsMatch(${field}, "^${condition.value}")`;
      case 'endsWith':
        return `IsMatch(${field}, "${condition.value}$")`;
      case 'exists':
        return `${field} != nil`;
      case 'notExists':
        return `${field} == nil`;
      default:
        return '';
    }
  }

  return '';
}

/**
 * Converts an Elasticsearch field into the ottl getter.
 * It checks whether the field name starts with one of the otelPrefixes - if it does, it converts
 * it into the prefix plus the rest in [""], e.g. resource.attributes.my.test becomes resource.attributes["my.test"]
 * There is a special case for body.text - that just becomes body, and body.structured.my.test becomes body["my.test"]
 */
function fieldToOTTLGetter(fieldName: string) {
  const prefix = otelPrefixes.find((p) => fieldName.startsWith(p));
  if (prefix) {
    const rest = fieldName.slice(prefix.length + 1);
    const prefixWithoutDot = prefix.slice(0, -1);
    return `${prefixWithoutDot}["${rest}"]`;
  }

  if (fieldName === 'body.text') {
    return 'body';
  }

  if (fieldName.startsWith('body.structured.')) {
    const rest = fieldName.slice('body.structured.'.length);
    return `body["${rest}"]`;
  }

  throw new Error(`Field ${fieldName} is not supported for OTel processing`);
}

export function generateOtelReroutePipeline(
  streams: WiredStreamDefinition[]
): IngestPutPipelineRequest {
  return {
    id: 'otel-rerouter@streams',
    processors: streams.map((stream) => ({
      reroute: {
        destination: stream.name,
        if: `ctx.attributes.target_stream == "${stream.name}"`,
      },
    })),
  };
}

/*
receivers:
  filelog:
    include: ["/Users/joereuter/Downloads/otelcollector/testlogs/*.log"]  # Adjust to your log file path

processors:
  transform/main_meta:
    log_statements:
      - context: log
        statements:
          - set(attributes["target_stream"], "logs")

  transform/json_parsing:
    error_mode: ignore
    log_statements:
      - context: log
        conditions:
          - body != nil and Substring(body, 0, 2) == "{\""
        statements:
          - set(cache, ParseJSON(body))
          - flatten(cache, "")
          - merge_maps(attributes, cache, "upsert")

  transform/abc_meta:
    log_statements:
      - context: log
        statements:
          - merge_maps(attributes, ExtractGrokPatterns(body, "%{NUMBER:numberfield}", true), "upsert")
      - context: log
        statements:
          - merge_maps(attributes, ExtractGrokPatterns(body, "%{NUMBER:numberfield}", true), "upsert")
          - set(attributes["target_stream"], "sub_pipeline_abc")

  transform/java_meta:
    log_statements:
      - context: log
        statements:
          - set(attributes["target_stream"], "sub_pipeline_java")

connectors:
  routing:
    match_once: true
    default_pipelines: [logs/other]
    table:
      - context: log
        condition: 'attributes["log.file.name"] == "xxx.log"'
        pipelines: [logs/abc]
      - context: log
        condition: 'IsMatch(body, "JavaComponent")'
        pipelines: [logs/java]

exporters:
  debug:
    verbosity: detailed
  elasticsearch:
    endpoints: # List of Elasticsearch endpoints.
    - http://localhost:9200
    api_key: MW9xZERaUUJvaGJ0NjBPamR0RmE6QlFmVVNham1TN0M2QkVPaWg1MTV2UQ==
    logs_index: logs
    # Enable in order to skip the SSL certificate Check
    # tls:
    #   insecure_skip_verify: true
    mapping:
      mode: otel


service:
  pipelines:
    intake:
      receivers: [filelog]
      processors: [transform/json_parsing, transform/main_meta]
      exporters: [routing]

    logs/abc:
      receivers: [routing]
      processors: [transform/abc_meta]
      exporters: [debug, elasticsearch]

    logs/java:
      receivers: [routing]
      processors: [transform/java_meta]
      exporters: [debug, elasticsearch]

    logs/other:
      receivers: [routing]
      processors: []
      exporters: [debug, elasticsearch]
      */
