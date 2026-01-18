/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '../definitions/entity_schema';
import {
  ENTITY_LATEST,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  ENTITY_ENTITY_COMPONENT_TEMPLATE_V2,
  ENTITY_EVENT_COMPONENT_TEMPLATE_V2,
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V2,
  getEntityIndexPattern,
  getEntitiesAliasPattern,
} from '../constants';
import { getComponentTemplateName } from '../assets_manager';

// Mostly copied from x-pack/platform/plugins/shared/entity_manager/server/lib/entities/templates/entities_latest_template.ts

export const generateLatestIndexTemplateId = (definition: EntityDefinition) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_LATEST}_${definition.id}_index_template` as const;

export const generateEntitiesLatestIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generateLatestIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the latest dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V2,
    ENTITY_ENTITY_COMPONENT_TEMPLATE_V2,
    ENTITY_EVENT_COMPONENT_TEMPLATE_V2,
    getComponentTemplateName(definition.id),
  ],
  index_patterns: [
    getEntityIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V2,
      dataset: ENTITY_LATEST,
      definitionId: definition.id,
    }),
  ],
  priority: 100, // TODO: 200
  template: {
    aliases: {
      [getEntitiesAliasPattern({ type: definition.type, dataset: ENTITY_LATEST })]: {},
    },
    mappings: {
      _meta: { n: '1.6.0' },
      date_detection: false,
      dynamic_templates: [
        {
          strings_as_keyword: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
              fields: { text: { type: 'text' } },
            },
            match_mapping_type: 'string',
          },
        },
      ],
    },
    settings: {
      index: {
        codec: 'best_compression',
        mapping: { total_fields: { limit: 2000 } },
      },
    },
  },
});
