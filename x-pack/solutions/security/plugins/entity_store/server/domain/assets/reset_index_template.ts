/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '../definitions/entity_schema';
import {
  ENTITY_RESET,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  getEntityIndexPattern,
  getEntitiesAliasPattern,
} from '../constants';
import { getResetComponentTemplateName } from './component_templates';

export const getResetIndexTemplateId = (definition: EntityDefinition) =>
  `.${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_RESET}_${definition.id}_index_template` as const;

export const getResetEntityIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: getResetIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the latest dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  composed_of: [ECS_MAPPINGS_COMPONENT_TEMPLATE, getResetComponentTemplateName(definition.id)],
  index_patterns: [
    getEntityIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V2,
      dataset: ENTITY_RESET,
      definitionId: definition.id,
    }),
  ],
  priority: 200,
  template: {
    aliases: {
      [getEntitiesAliasPattern({ type: definition.type, dataset: ENTITY_RESET })]: {},
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
        mode: 'lookup',
      },
    },
  },
});
