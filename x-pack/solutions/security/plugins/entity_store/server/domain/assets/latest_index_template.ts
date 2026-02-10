/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_LATEST,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  getEntityIndexPattern,
  getEntitiesAliasPattern,
} from '../constants';
import { getComponentTemplateName } from './component_templates';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';

// Mostly copied from x-pack/platform/plugins/shared/entity_manager/server/lib/entities/templates/entities_latest_template.ts

export const getLatestIndexTemplateId = (namespace: string) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_LATEST}_security_${namespace}_index_template` as const;

export const getLatestEntityIndexTemplateConfig = (
  namespace: string
): IndicesPutIndexTemplateRequest => ({
  name: getLatestIndexTemplateId(namespace),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the latest dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ...ALL_ENTITY_TYPES.map((t) => getComponentTemplateName(t, namespace)),
  ],
  ignore_missing_component_templates: [
    ...ALL_ENTITY_TYPES.map((t) => getComponentTemplateName(t, namespace)),
  ],
  index_patterns: [
    getEntityIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V2,
      dataset: ENTITY_LATEST,
      namespace,
    }),
  ],
  priority: 200,
  template: {
    aliases: {
      [getEntitiesAliasPattern({ dataset: ENTITY_LATEST })]: {},
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
