/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition, isWiredStream } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { getProcessingPipelineName } from '../ingest_pipelines/name';
import { getIndexTemplateName } from './name';

export function generateIndexTemplate(
  definition: StreamDefinition,
  classicRoot?: StreamDefinition
) {
  const name = definition.name;
  let composedOf = name.split('.').reduce((acc, _, index, array) => {
    const parent = array.slice(0, index + 1).join('.');
    return [...acc, `${parent}@stream.layer`];
  }, [] as string[]);

  if (isWiredStream(definition) && classicRoot) {
    // if the stream is managed and has a classic root, we need to:
    // * find the dataset of the classic root
    // * for every part (separated by dots) added after that, add the @stream.layer component template
    const classicRootDataset = classicRoot.name.split('-')[1];
    const dataset = name.split('-')[1];
    const classicRootDatasetParts = classicRootDataset.split('.');
    const datasetParts = dataset.split('.');
    let commonParts = 0;
    while (classicRootDatasetParts[commonParts] === datasetParts[commonParts]) {
      commonParts++;
    }
    composedOf = [
      `${classicRoot.name}@stream.layer`,
      ...datasetParts.slice(commonParts).map((part, index) => {
        return `${classicRoot.name.split('-')[0]}-${classicRootDatasetParts
          .slice(0, commonParts + index + 1)
          .join('.')}-${classicRoot.name.split('-')[2]}@stream.layer`;
      }),
    ];
  }

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
      failure_store: true,
    },
    template: {
      settings: {
        index: {
          default_pipeline: getProcessingPipelineName(name),
        },
      },
    },
    allow_auto_create: true,
    // ignore missing component templates to be more robust against out-of-order syncs
    ignore_missing_component_templates: composedOf,
  };
}
