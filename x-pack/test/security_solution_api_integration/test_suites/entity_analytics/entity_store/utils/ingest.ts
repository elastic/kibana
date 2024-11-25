/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ToolingLog } from '@kbn/tooling-log';

export const applyIngestProcessorToDoc = async (
  steps: IngestProcessorContainer[],
  docSource: any,
  es: Client,
  log: ToolingLog
): Promise<any> => {
  const doc = {
    _index: 'index',
    _id: 'id',
    _source: docSource,
  };

  const res = await es.ingest.simulate({
    pipeline: {
      description: 'test',
      processors: steps,
    },
    docs: [doc],
  });

  const firstDoc = res.docs?.[0];

  // @ts-expect-error error is not in the types
  const error = firstDoc?.error;
  if (error) {
    log.error('Full painless error below: ');
    log.error(JSON.stringify(error, null, 2));
    throw new Error('Painless error running pipeline see logs for full detail : ' + error?.type);
  }

  return firstDoc?.doc?._source;
};
