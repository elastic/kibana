/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { deepFreeze } from '@kbn/std';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Wildcard pattern covering all space-specific log-injection indices. */
export const EMULATION_LOGS_INDEX_PATTERN = '.kibana-security-emulation-logs-*';
export const EMULATION_LOGS_INDEX_TEMPLATE_NAME = '.kibana-security-emulation-logs';
export const EMULATION_LOGS_ILM_POLICY_NAME = '.kibana-security-emulation-logs-ilm';

// ─── ILM policy ───────────────────────────────────────────────────────────────

const EMULATION_LOGS_ILM_POLICY = {
  phases: {
    delete: {
      min_age: '7d',
      actions: { delete: {} },
    },
  },
} as const;

// ─── Index template ───────────────────────────────────────────────────────────

export const EMULATION_LOGS_INDEX_TEMPLATE = deepFreeze<IndicesPutIndexTemplateRequest>({
  name: EMULATION_LOGS_INDEX_TEMPLATE_NAME,
  index_patterns: [EMULATION_LOGS_INDEX_PATTERN],
  priority: 500,
  allow_auto_create: true,
  _meta: {
    description: 'Index template for Detection Emulation log-injection synthetic events',
    managed: true,
  },
  template: {
    settings: {
      'index.hidden': true,
      'index.auto_expand_replicas': '0-1',
      'index.lifecycle.name': EMULATION_LOGS_ILM_POLICY_NAME,
    },
    mappings: {
      dynamic: 'runtime',
      properties: {
        '@timestamp': { type: 'date' },
        event: {
          properties: {
            category: { type: 'keyword' },
            type: { type: 'keyword' },
            kind: { type: 'keyword' },
            dataset: { type: 'keyword' },
            module: { type: 'keyword' },
          },
        },
        process: {
          properties: {
            name: { type: 'keyword' },
            pid: { type: 'long' },
            entity_id: { type: 'keyword' },
            executable: { type: 'keyword' },
            command_line: { type: 'wildcard' },
            working_directory: { type: 'keyword' },
            args: { type: 'keyword' },
            parent: {
              properties: {
                name: { type: 'keyword' },
                pid: { type: 'long' },
                entity_id: { type: 'keyword' },
              },
            },
          },
        },
        host: { properties: { id: { type: 'keyword' }, name: { type: 'keyword' }, os: { properties: { type: { type: 'keyword' } } } } },
        user: { properties: { name: { type: 'keyword' } } },
        agent: { properties: { type: { type: 'keyword' } } },
        file: {
          properties: {
            name: { type: 'keyword' },
            path: { type: 'keyword' },
            extension: { type: 'keyword' },
          },
        },
        network: {
          properties: {
            direction: { type: 'keyword' },
            transport: { type: 'keyword' },
          },
        },
        destination: {
          properties: {
            ip: { type: 'ip' },
            port: { type: 'long' },
            domain: { type: 'keyword' },
          },
        },
        source: {
          properties: {
            ip: { type: 'ip' },
            port: { type: 'long' },
          },
        },
        dns: {
          properties: {
            question: {
              properties: {
                name: { type: 'keyword' },
                type: { type: 'keyword' },
              },
            },
          },
        },
        registry: {
          properties: {
            path: { type: 'keyword' },
            data: {
              properties: {
                strings: { type: 'keyword' },
              },
            },
          },
        },
        kibana: {
          properties: {
            alert: {
              properties: {
                emulation: {
                  properties: {
                    id: { type: 'keyword' },
                    mode: { type: 'keyword' },
                    scenarioFingerprint: { type: 'keyword' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}) as IndicesPutIndexTemplateRequest;

// ─── Registration ─────────────────────────────────────────────────────────────

export interface RegisterEmulationLogsIndexTemplateOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
}

/**
 * Puts the ILM policy then the index template; called during plugin start.
 *
 * Errors are logged but not re-thrown — a missing template degrades the
 * log-injection mode gracefully without blocking plugin startup.
 */
export const registerEmulationLogsIndexTemplate = async ({
  esClient,
  logger,
}: RegisterEmulationLogsIndexTemplateOptions): Promise<void> => {
  logger.debug('[detection_emulation] Registering emulation logs ILM policy and index template');

  try {
    await esClient.ilm.putLifecycle({
      name: EMULATION_LOGS_ILM_POLICY_NAME,
      policy: EMULATION_LOGS_ILM_POLICY,
    });
  } catch (err) {
    logger.warn(
      `[detection_emulation] Failed to register ILM policy: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  try {
    await esClient.indices.putIndexTemplate(EMULATION_LOGS_INDEX_TEMPLATE);
  } catch (err) {
    logger.warn(
      `[detection_emulation] Failed to register index template: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
