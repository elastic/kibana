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

/**
 * The `ai-index-idx` template matches every AI index and does not map the space privilege as
 * `nested`. A template for the exact index name, at a higher priority, is what the worker's first
 * write uses when Elasticsearch auto-creates the index.
 */
const BASE_INDEX_TEMPLATE = 'ai-index-idx';
const FALLBACK_TEMPLATE_PRIORITY = 501;
const FALLBACK_COMPOSED_OF = ['ai-index@mappings'] as const;

/**
 * `permissions.kibana.privileges` has to be `nested` or Context Engine's space filter
 * ignores it and every space can read the document.
 */
export const SPACE_SCOPED_INDEX_MAPPINGS: MappingTypeMapping = {
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
  /** Component templates the base template allows to be absent, such as `ai-index@custom`. */
  ignoreMissingComponentTemplates: string[];
  settings?: IndicesIndexSettings;
  properties?: MappingTypeMapping['properties'];
}

const componentNames = (value: string | readonly string[] | undefined): string[] => {
  const names = typeof value === 'string' ? [value] : (value ?? []);
  return names.filter((name) => name.length > 0);
};

const fallbackBaseTemplate = (): BaseTemplate => ({
  priority: FALLBACK_TEMPLATE_PRIORITY,
  composedOf: [...FALLBACK_COMPOSED_OF],
  ignoreMissingComponentTemplates: [],
});

const readBaseTemplate = async (esClient: ElasticsearchClient): Promise<BaseTemplate> => {
  try {
    const response = await esClient.indices.getIndexTemplate({ name: BASE_INDEX_TEMPLATE });
    const found = response.index_templates.find((item) => item.name === BASE_INDEX_TEMPLATE);
    if (found === undefined) {
      return fallbackBaseTemplate();
    }
    const template = found.index_template;
    const composedOf = template.composed_of ?? [];
    return {
      priority: (template.priority ?? FALLBACK_TEMPLATE_PRIORITY - 1) + 1,
      composedOf: composedOf.length > 0 ? [...composedOf] : [...FALLBACK_COMPOSED_OF],
      ignoreMissingComponentTemplates: componentNames(template.ignore_missing_component_templates),
      settings: template.template?.settings,
      properties: template.template?.mappings?.properties,
    };
  } catch {
    return fallbackBaseTemplate();
  }
};

const spaceScopedMappings = (baseProperties: MappingTypeMapping['properties']) => ({
  properties: {
    ...baseProperties,
    ...SPACE_SCOPED_INDEX_MAPPINGS.properties,
  },
});

export interface SpaceScopedIndex {
  indexName: string;
  templateName: string;
  logLabel: string;
}

/**
 * Installs the template that maps the space privilege as `nested`. `kibana_system` cannot create
 * the index or change its mapping, so the first write must auto-create it from this template; on
 * `false` it must not.
 */
export const ensureSpaceScopedIndexTemplate = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  { indexName, templateName, logLabel }: SpaceScopedIndex
): Promise<boolean> => {
  const base = await readBaseTemplate(esClient);
  try {
    await esClient.indices.putIndexTemplate({
      name: templateName,
      index_patterns: [indexName],
      priority: base.priority,
      composed_of: base.composedOf,
      // `ai-index@custom` is optional. Without the base template's ignore list,
      // Elasticsearch rejects this template on a cluster that has not installed it.
      ...(base.ignoreMissingComponentTemplates.length === 0
        ? {}
        : { ignore_missing_component_templates: base.ignoreMissingComponentTemplates }),
      template: {
        ...(base.settings === undefined ? {} : { settings: base.settings }),
        mappings: spaceScopedMappings(base.properties),
      },
    });
  } catch (error) {
    logger.warn(`${logLabel} index template was not installed: ${errorText(error)}`);
    return false;
  }

  try {
    const exists = await esClient.indices.exists({ index: indexName });
    if (exists !== true) {
      return true;
    }

    const response = await esClient.indices.getMapping({ index: indexName });
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
      `${logLabel} index ${indexName} ${detail}. ` +
        'Context Engine cannot space-scope that field until the index is recreated.'
    );
  } catch (error) {
    logger.warn(`${logLabel} index mapping was not read: ${errorText(error)}`);
  }
  return true;
};
