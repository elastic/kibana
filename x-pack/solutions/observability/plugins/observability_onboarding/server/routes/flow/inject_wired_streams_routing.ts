/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wired Streams Routing for Auto-Detect Flow
 *
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

/**
 * Creates the processor that routes logs to Wired Streams.
 * Sets @metadata.raw_index to 'logs' which Elastic Agent uses to override
 * the default data stream routing and send data to the hierarchical logs stream.
 */
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


/**
 * Parses an Elastic Agent YAML config and injects the Wired Streams routing
 * processor into all log-type streams.
 *
 * Handles two common config patterns:
 * 1. Inputs with nested streams (e.g., filestream, logfile integrations):
 *    inputs:
 *      - type: logfile
 *        streams:
 *          - data_stream: { type: logs, dataset: ... }
 *
 * 2. Inputs with direct data_stream (e.g., journald, some custom integrations):
 *    inputs:
 *      - type: journald
 *        data_stream: { type: logs, dataset: ... }
 *
 * Only streams with `data_stream.type === 'logs'` are modified to ensure
 * metrics and other data types continue routing to their normal destinations.
 */
export function injectWiredStreamsRouting(configYaml: string) {
  const config = load(configYaml);

  if (!config.inputs || !Array.isArray(config.inputs)) {
    return configYaml;
  }

  for (const input of config.inputs) {
    // Pattern 1: Inputs with nested streams array
    if (input.streams && Array.isArray(input.streams)) {
      for (const stream of input.streams) {
        if (stream.data_stream?.type === 'logs') {
          stream.processors = stream.processors || [];
          stream.processors.unshift(createWiredStreamsRoutingProcessor());
        }
      }
    }

    // Pattern 2: Inputs with direct data_stream (no nested streams)
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
