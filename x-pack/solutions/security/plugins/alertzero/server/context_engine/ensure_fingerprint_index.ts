/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { ATTACK_FINGERPRINT_AI_INDEX_ID } from './register_investigations_ai_index';

const FINGERPRINT_INDEX = getAiIndexDest('index', ATTACK_FINGERPRINT_AI_INDEX_ID).value;

/**
 * The `ai-index-idx` template matches this index and does not map the space privilege as
 * `nested`. A template for this exact name, at a higher priority, is what the worker's first
 * write uses when Elasticsearch auto-creates the index.
 */
const BASE_INDEX_TEMPLATE = 'ai-index-idx';
const FINGERPRINT_INDEX_TEMPLATE = 'security-attack-fingerprint';
const FALLBACK_TEMPLATE_PRIORITY = 501;
const FALLBACK_COMPOSED_OF = ['ai-index@mappings'] as const;

/**
 * `permissions.kibana.privileges` has to be `nested` or Context Engine's space filter
 * ignores it and every space can read the document.
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

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface BaseTemplate {
  priority: number;
  composedOf: string[];
  settings?: IndicesIndexSettings;
  properties?: MappingTypeMapping['properties'];
}

const fallbackBaseTemplate = (): BaseTemplate => ({
  priority: FALLBACK_TEMPLATE_PRIORITY,
  composedOf: [...FALLBACK_COMPOSED_OF],
});

const readBaseTemplate = async (esClient: ElasticsearchClient): Promise<BaseTemplate> => {
  try {
    const response = await esClient.indices.getIndexTemplate({ name: BASE_INDEX_TEMPLATE });
    const found = response.index_templates.find((item) => item.name === BASE_INDEX_TEMPLATE);
    if (found === undefined) {
      return fallbackBaseTemplate();
    }
    const template = found.index_template;
    return {
      priority: (template.priority ?? FALLBACK_TEMPLATE_PRIORITY - 1) + 1,
      composedOf: template.composed_of ?? [...FALLBACK_COMPOSED_OF],
      settings: template.template?.settings,
      properties: template.template?.mappings?.properties,
    };
  } catch {
    return fallbackBaseTemplate();
  }
};

const fingerprintMappings = (baseProperties: MappingTypeMapping['properties']) => ({
  properties: {
    ...baseProperties,
    ...FINGERPRINT_INDEX_MAPPINGS.properties,
  },
});

/**
 * Installs the fingerprint index template. `kibana_system` can manage index templates and
 * cannot create this index or change its mapping, so an existing index with the wrong
 * mapping has to be recreated. The worker's first write then auto-creates it from this template.
 */
/** True when the fingerprint template is installed. A false result must not auto-create the index. */
export const ensureFingerprintIndexMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<boolean> => {
  const base = await readBaseTemplate(esClient);
  try {
    await esClient.indices.putIndexTemplate({
      name: FINGERPRINT_INDEX_TEMPLATE,
      index_patterns: [FINGERPRINT_INDEX],
      priority: base.priority,
      composed_of: base.composedOf,
      template: {
        ...(base.settings === undefined ? {} : { settings: base.settings }),
        mappings: fingerprintMappings(base.properties),
      },
    });
  } catch (error) {
    logger.warn(`Attack fingerprint index template was not installed: ${errorText(error)}`);
    return false;
  }

  try {
    const exists = await esClient.indices.exists({ index: FINGERPRINT_INDEX });
    if (exists !== true) {
      return true;
    }

    const response = await esClient.indices.getMapping({ index: FINGERPRINT_INDEX });
    const current = Object.values(response)[0]?.mappings as Record<string, unknown> | undefined;
    const type = privilegesType(current);
    if (type === 'nested') {
      return true;
    }

    const detail =
      type === undefined
        ? 'has no nested permissions.kibana.privileges mapping'
        : `maps permissions.kibana.privileges as ${type}`;
    logger.warn(
      `Attack fingerprint index ${FINGERPRINT_INDEX} ${detail}. ` +
        'Context Engine cannot space-scope that field until the index is recreated.'
    );
  } catch (error) {
    logger.warn(`Attack fingerprint index mapping was not read: ${errorText(error)}`);
  }
  return true;
};
