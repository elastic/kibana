/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition, isWiredStreamDefinition } from '@kbn/streams-schema';
import { parseStreamName } from '@kbn/streams-schema/src/helpers/stream_name';
import { stringifyStreamName } from '@kbn/streams-schema/src/helpers/stream_name/stringify';
import { ASSET_VERSION } from '../../../../common/constants';
import { getProcessingPipelineName } from '../ingest_pipelines/name';
import { getIndexTemplateName } from './name';

export function generateIndexTemplate(
  definition: StreamDefinition,
  isServerless: boolean,
  classicRoot?: StreamDefinition
) {
  const name = definition.name;
  const streamName = parseStreamName(name);
  let composedOf: string[] = [];

  if (!isWiredStreamDefinition(definition)) {
    throw new Error(`Can only generate index templates for wired streams`);
  }

  if (streamName.type === 'unknown') {
    throw new Error(`Unknown stream type: ${name}`);
  }

  if (streamName.type === 'dsns') {
    if (!classicRoot) {
      classicRoot = definition;
    }
    const classicRootStreamName = parseStreamName(classicRoot.name);
    if (classicRootStreamName.type !== 'dsns') {
      throw new Error(`Classic root ${classicRoot?.name} is not a DSNS stream`);
    }
    // if the stream is wired and has a classic root, we need to:
    // * find the dataset of the classic root
    // * for every part (separated by dots) added after that, add the @stream.layer component template
    let commonParts = 0;
    while (
      classicRootStreamName.datasetSegments[commonParts] ===
        streamName.datasetSegments[commonParts] &&
      commonParts < classicRootStreamName.datasetSegments.length
    ) {
      commonParts++;
    }
    composedOf = [
      `${classicRoot.name}@stream.layer`,
      ...streamName.datasetSegments.slice(commonParts).map((part, index) => {
        const parentStreamName = stringifyStreamName({
          type: 'dsns',
          datastreamType: streamName.datastreamType,
          datastreamNamespace: streamName.datastreamNamespace,
          datasetSegments: streamName.datasetSegments.slice(0, commonParts + index + 1),
        });
        return `${parentStreamName}@stream.layer`;
      }),
    ];
  } else {
    composedOf = streamName.segments.reduce((acc, _, index, array) => {
      const parent = stringifyStreamName({
        type: 'wired',
        segments: array.slice(0, index + 1),
      });
      return [...acc, `${parent}@stream.layer`];
    }, [] as string[]);
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
      failure_store: isServerless ? undefined : true, // TODO: Enable failure store for serverless once it is rolled out
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
