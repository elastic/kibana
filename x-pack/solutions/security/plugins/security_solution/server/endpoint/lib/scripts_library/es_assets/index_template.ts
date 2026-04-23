/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { deepFreeze } from '@kbn/std';
import {
  SCRIPTS_LIBRARY_FILE_DATA_INDEX_TEMPLATE_NAME,
  SCRIPTS_LIBRARY_FILE_DATA_INDEX_TEMPLATE_PATTERN,
  SCRIPTS_LIBRARY_FILE_METADATA_INDEX_TEMPLATE_NAME,
  SCRIPTS_LIBRARY_FILE_METADATA_INDEX_TEMPLATE_PATTERN,
} from '../constants';

/**
 * Index template for storing File metadata. Index is used mainly with the Files plugin
 * to manage files associated with Elastic Defend Scripts library entries
 */
export const ScriptsFileMetadataIndexTemplate = deepFreeze<IndicesPutIndexTemplateRequest>({
  name: SCRIPTS_LIBRARY_FILE_METADATA_INDEX_TEMPLATE_NAME,
  index_patterns: SCRIPTS_LIBRARY_FILE_METADATA_INDEX_TEMPLATE_PATTERN,
  priority: 500,
  allow_auto_create: true,
  _meta: {
    description: 'Index template for Elastic Defend scripts library storage of file metadata',
    managed: true,
  },
  template: {
    settings: {
      'index.auto_expand_replicas': '0-1',
      'index.hidden': true,
    },
    mappings: {
      dynamic: false,
      properties: {},
    },
  },
}) as IndicesPutIndexTemplateRequest;

/**
 * Index template for storing File data content. Index is used mainly with the Files plugin
 * to manage files associated with Elastic Defend Scripts library entries
 */
export const ScriptsFileDataIndexTemplate = deepFreeze<IndicesPutIndexTemplateRequest>({
  name: SCRIPTS_LIBRARY_FILE_DATA_INDEX_TEMPLATE_NAME,
  index_patterns: SCRIPTS_LIBRARY_FILE_DATA_INDEX_TEMPLATE_PATTERN,
  priority: 500,
  allow_auto_create: true,
  _meta: {
    description: 'Index template for Elastic Defend scripts library storage of file data content',
    managed: true,
  },
  template: {
    settings: {
      'index.auto_expand_replicas': '0-1',
      'index.hidden': true,
    },
    mappings: {
      dynamic: false,
      properties: {
        data: {
          type: 'binary',
          store: true,
        },
        bid: {
          type: 'keyword',
        },
        sha2: {
          type: 'keyword',
          index: false,
        },
        last: {
          type: 'boolean',
          index: false,
        },
      },
    },
  },
}) as IndicesPutIndexTemplateRequest;
