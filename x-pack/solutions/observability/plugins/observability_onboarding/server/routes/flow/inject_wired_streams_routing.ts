/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This module handles routing logs to Wired Streams (the hierarchical `logs` stream)
 * for the auto-detect onboarding flow. Unlike other flows (OTel Host, OTel Kubernetes,
 * Elastic Agent Kubernetes) that use simpler configuration options like `logs_index`,
 * Helm `--set`, or Fleet's `_write_to_logs_streams`, the auto-detect flow requires
 * direct YAML config manipulation.
 *
 * Why we need this approach:
 * - The auto-detect flow generates standalone Elastic Agent configs (not Fleet-managed)
 * - These configs don't have access to Fleet's `_write_to_logs_streams` output option
 * - We must inject a processor that tells Elastic Agent where to route the data
 *
 * How it works:
 * - The `add_fields` processor sets `@metadata.raw_index: 'logs'`
 * - Elastic Agent reads this metadata field and uses it to override the default
 *   data stream routing (e.g., `logs-*-*`) and instead sends data to the `logs` stream
 * - The processor is added first (unshift) to ensure it runs before any other processors
 *   that might depend on or modify the routing
 */

import { load, dump } from 'js-yaml';

interface Processor {
  add_fields?: {
    target: string;
    fields: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface Stream {
  id?: string;
  data_stream?: {
    type?: string;
    dataset?: string;
    namespace?: string;
  };
  processors?: Processor[];
  [key: string]: unknown;
}


export function createWiredStreamsRoutingProcessor(): Processor {
  return {
    add_fields: {
      target: '@metadata',
      fields: {
        raw_index: 'logs',
      },
    },
  };
}


export function injectWiredStreamsRouting(configYaml: string) {
  const config = load(configYaml);

  if (!config.inputs || !Array.isArray(config.inputs)) {
    return configYaml;
  }

  for (const input of config.inputs) {
    if (input.streams && Array.isArray(input.streams)) {
      for (const stream of input.streams) {
        if (stream.data_stream?.type === 'logs') {
          stream.processors = stream.processors || [];
          stream.processors.unshift(createWiredStreamsRoutingProcessor());
        }
      }
    }

    const inputWithDataStream = input as Stream;
    if (!input.streams && inputWithDataStream.data_stream?.type === 'logs') {
      inputWithDataStream.processors = inputWithDataStream.processors || [];
      inputWithDataStream.processors.unshift(createWiredStreamsRoutingProcessor());
    }
  }

  return dump(config, {
    skipInvalid: true,
  });
}
