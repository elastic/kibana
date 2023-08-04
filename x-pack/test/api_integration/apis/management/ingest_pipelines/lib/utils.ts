/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface Pipeline {
  name: string;
  description?: string;
  onFailureProcessors?: estypes.IngestProcessorContainer[];
  processors?: estypes.IngestProcessorContainer[];
  version?: estypes.VersionNumber;
  metadata: estypes.Metadata;
}

export const createIngestPipelineBody = ({
  name,
  description = 'test pipeline description',
  processors,
  onFailureProcessors,
  version = 1,
  metadata,
}: Pipeline) => {
  return {
    name,
    description,
    processors: processors ?? [],
    onFailureProcessors: onFailureProcessors ?? [],
    version,
    metadata,
  };
};
