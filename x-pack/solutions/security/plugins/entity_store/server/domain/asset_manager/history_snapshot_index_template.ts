/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ECS_MAPPINGS_COMPONENT_TEMPLATE } from '../constants';
import {
  ENTITY_HISTORY,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  MAPPING_VERSION,
} from '../../../common/domain/entity_index';
import { getComponentTemplateName } from './component_templates';
import { getHistorySnapshotIndexPattern } from './history_snapshot_index';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';

export const getHistorySnapshotIndexTemplateId = (namespace: string) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_HISTORY}_security_${namespace}_index_template` as const;

export const getHistorySnapshotIndexTemplateConfig = (
  namespace: string
): IndicesPutIndexTemplateRequest => ({
  name: getHistorySnapshotIndexTemplateId(namespace),
  _meta: {
    description: 'Index template for history snapshot indices managed by the Elastic Entity Store',
    ecs_version: '9.3.0',
    managed: true,
    managed_by: 'contextual_security_core_analysis',
  },
  composed_of: [
    ECS_MAPPINGS_COMPONENT_TEMPLATE,
    ...ALL_ENTITY_TYPES.map((t) => getComponentTemplateName(t, namespace)),
  ],
  ignore_missing_component_templates: [
    ...ALL_ENTITY_TYPES.map((t) => getComponentTemplateName(t, namespace)),
  ],
  index_patterns: [getHistorySnapshotIndexPattern(namespace)],
  priority: 200,
  template: {
    mappings: {
      _meta: { mappingsVersion: MAPPING_VERSION },
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
