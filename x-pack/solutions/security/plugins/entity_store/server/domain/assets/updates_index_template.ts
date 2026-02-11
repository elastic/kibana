/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_UPDATES,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  ECS_MAPPINGS_COMPONENT_TEMPLATE,
  getEntityIndexPattern,
  getEntitiesAliasPattern,
} from '../constants';
import { getUpdatesComponentTemplateName } from './component_templates';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';

const DATA_RETENTION_PERIOD = '1d';
export const getUpdatesIndexTemplateId = (namespace: string) =>
  `.${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_UPDATES}_security_${namespace}_index_template` as const;

export const getUpdatesEntityIndexTemplateConfig = (
  namespace: string
): IndicesPutIndexTemplateRequest => ({
  name: getUpdatesIndexTemplateId(namespace),
  _meta: {
    description:
      'Index template for data streams managed by the Elastic Entity Store ' +
      'used as for internal asynchronous entity store updates and ensuring that all ' +
      'necessary mappings are available to be queried by the ESQL query',
    ecs_version: '9.2.0',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ...ALL_ENTITY_TYPES.map((t) => getUpdatesComponentTemplateName(t, namespace)),
  ],
  ignore_missing_component_templates: [
    ...ALL_ENTITY_TYPES.map((t) => getUpdatesComponentTemplateName(t, namespace)),
  ],
  index_patterns: [
    getEntityIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V2,
      dataset: ENTITY_UPDATES,
      namespace,
    }),
  ],
  priority: 200,
  data_stream: {},
  template: {
    lifecycle: {
      data_retention: DATA_RETENTION_PERIOD,
    },
    aliases: {
      [getEntitiesAliasPattern({ dataset: ENTITY_UPDATES })]: {},
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
