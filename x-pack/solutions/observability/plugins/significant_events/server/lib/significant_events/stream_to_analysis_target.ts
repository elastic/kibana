/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalysisTarget } from '@kbn/nightshift-ai';
import { getSourcesForStream, getStreamSamplingSource, type Streams } from '@kbn/streams-schema';

/**
 * Maps a stream definition onto the stream-agnostic analysis contract.
 */
export const streamToAnalysisTarget = (definition: Streams.all.Definition): AnalysisTarget => ({
  id: definition.name,
  name: definition.name,
  description: definition.description,
  sources: getSourcesForStream(definition),
  samplingSource: getStreamSamplingSource(definition),
});
