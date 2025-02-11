/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAncestorsAndSelf } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { getProcessingPipelineName } from '../ingest_pipelines/name';
import { getIndexTemplateName } from './name';

export function generateIndexTemplate(name: string, isServerless: boolean) {
  const composedOf = getAncestorsAndSelf(name).reduce((acc, ancestorName) => {
    return [...acc, `${ancestorName}@stream.layer`];
  }, [] as string[]);

  return {
    name: getIndexTemplateName(name),
    index_patterns: [name],
    composed_of: composedOf,
    priority: 200,
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `The index template for ${name} stream`,
    },
    data_stream: {
      hidden: false,
      failure_store: isServerless ? undefined : true, // TODO: Enable failure store for serverless once it is rolled out
    },
    template: {
      settings: {
        index: {
          default_pipeline: getProcessingPipelineName(name),
        },
      },
      mappings: {
        properties: {
          'stream.name': {
            type: 'constant_keyword' as const,
            value: name,
          },
        },
      },
    },
    allow_auto_create: true,
    // ignore missing component templates to be more robust against out-of-order syncs
    ignore_missing_component_templates: composedOf,
  };
}
