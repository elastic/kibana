/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingKeywordProperty, MappingTextProperty } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { textAnalysisSettings } from './text_analysis';

const prefixMapping: MappingTextProperty = {
  analyzer: 'i_prefix',
  index_options: 'docs',
  search_analyzer: 'q_prefix',
  type: 'text',
};

const delimiterMapping: MappingTextProperty = {
  analyzer: 'iq_text_delimiter',
  index_options: 'freqs',
  type: 'text',
};

const joinedMapping: MappingTextProperty = {
  analyzer: 'i_text_bigram',
  index_options: 'freqs',
  search_analyzer: 'q_text_bigram',
  type: 'text',
};

const enumMapping: MappingKeywordProperty = {
  ignore_above: 2048,
  type: 'keyword',
};

const stemMapping: MappingTextProperty = {
  analyzer: 'iq_text_stem',
  type: 'text',
};

const defaultMappings = {
  dynamic: true,
  dynamic_templates: [
    {
      all_text_fields: {
        mapping: {
          analyzer: 'iq_text_base',
          fields: {
            delimiter: delimiterMapping,
            enum: enumMapping,
            joined: joinedMapping,
            prefix: prefixMapping,
            stem: stemMapping,
          },
        },
        match_mapping_type: 'string',
      },
    },
  ],
};

export const createIndex = async (
  client: IScopedClusterClient,
  indexName: string,
  language: string | undefined | null,
  applyMappings: boolean
) => {
  return await client.asCurrentUser.indices.create({
    index: indexName,
    mappings: applyMappings ? defaultMappings : {},
    settings: {
      ...textAnalysisSettings(language ?? undefined),
      auto_expand_replicas: '0-3',
      number_of_shards: 2,
    },
  });
};
