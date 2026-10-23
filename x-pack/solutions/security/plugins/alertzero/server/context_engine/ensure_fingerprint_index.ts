/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { ATTACK_FINGERPRINT_AI_INDEX_ID } from './register_investigations_ai_index';

const FINGERPRINT_INDEX = getAiIndexDest('index', ATTACK_FINGERPRINT_AI_INDEX_ID).value;

/**
 * `permissions.kibana.privileges` has to be `nested` or Context Engine's space filter
 * ignores it and every space can read the document. The non-dot AI index template does
 * not set that mapping, so this index is created with it explicitly.
 */
export const FINGERPRINT_INDEX_MAPPINGS: MappingTypeMapping = {
  properties: {
    permissions: {
      type: 'object',
      properties: {
        kibana: {
          type: 'object',
          properties: {
            privileges: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                space: { type: 'keyword' },
                count: { type: 'long' },
              },
            },
          },
        },
      },
    },
  },
};

const privilegesType = (mapping: Record<string, unknown> | undefined): string | undefined => {
  const properties = mapping?.properties as Record<string, unknown> | undefined;
  const permissions = properties?.permissions as
    | { properties?: Record<string, unknown> }
    | undefined;
  const kibana = permissions?.properties?.kibana as
    | { properties?: Record<string, unknown> }
    | undefined;
  const privileges = kibana?.properties?.privileges as { type?: string } | undefined;
  return privileges?.type;
};

/**
 * Creates the fingerprint index with a nested space privilege, or adds that mapping
 * when the field is not there yet. A field already mapped as an object cannot be
 * changed to nested; that index has to be recreated.
 */
export const ensureFingerprintIndexMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: FINGERPRINT_INDEX });
    if (exists !== true) {
      await esClient.indices.create({
        index: FINGERPRINT_INDEX,
        mappings: FINGERPRINT_INDEX_MAPPINGS,
      });
      return;
    }

    const response = await esClient.indices.getMapping({ index: FINGERPRINT_INDEX });
    const current = response[FINGERPRINT_INDEX]?.mappings as Record<string, unknown> | undefined;
    const type = privilegesType(current);
    if (type === 'nested') {
      return;
    }
    if (type === undefined) {
      await esClient.indices.putMapping({
        index: FINGERPRINT_INDEX,
        ...FINGERPRINT_INDEX_MAPPINGS,
      });
      return;
    }

    logger.warn(
      `Attack fingerprint index ${FINGERPRINT_INDEX} maps permissions.kibana.privileges as ${type}. ` +
        'Context Engine cannot space-scope that field until the index is recreated.'
    );
  } catch (error) {
    logger.warn(
      `Attack fingerprint index mapping was not ensured: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
