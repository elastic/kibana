/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { get } from 'lodash';
import { IndexAdapter, type FieldMap, type InstallParams } from '@kbn/index-adapter';

export interface IndexOptions extends Pick<InstallParams, 'pluginStop$' | 'tasksTimeoutMs'> {
  kibanaVersion: string;
}

interface EnsureIndexParams extends IndexOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  index: string;
  fieldMap: FieldMap;
}

export const ensureIndex = async ({
  esClient,
  logger,
  index,
  fieldMap,
  kibanaVersion,
  pluginStop$,
  tasksTimeoutMs,
}: EnsureIndexParams): Promise<void> => {
  const adapter = new IndexAdapter(index, { kibanaVersion, totalFieldsLimit: 2500 });
  adapter.setComponentTemplate({ name: index, fieldMap });
  adapter.setIndexTemplate({ name: index, componentTemplateRefs: [index] });
  await adapter.install({ esClient, logger, pluginStop$, tasksTimeoutMs });

  // Installation may return after a failed template simulation. Verify semantic mappings
  // before writing documents so inference uses the requested endpoints.
  const semanticFields = Object.entries(fieldMap).filter(
    ([, field]) => field.type === 'semantic_text'
  );
  if (semanticFields.length === 0) {
    return;
  }
  const mappings = await esClient.indices.getMapping({ index });
  for (const [fieldName, field] of semanticFields) {
    const path = fieldName.split('.').flatMap((part) => ['properties', part]);
    const mapping: MappingProperty | undefined = get(mappings[index]?.mappings, path);
    if (mapping?.type !== 'semantic_text' || mapping.inference_id !== field.inference_id) {
      throw new Error(
        `Expected inference endpoint ${field.inference_id} in the mapping for ${index}`
      );
    }
  }
};
