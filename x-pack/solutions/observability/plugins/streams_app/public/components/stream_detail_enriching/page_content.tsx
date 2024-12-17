/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StreamDefinition } from '@kbn/streams-plugin/common';

import { EnrichingEmptyPrompt } from './enriching_empty_prompt';

export function StreamDetailEnrichingContent({
  definition: _definition,
  refreshDefinition: _refreshDefinition,
}: {
  definition?: StreamDefinition;
  refreshDefinition: () => void;
}) {
  return <EnrichingEmptyPrompt onAddProcessor={() => {}} />;
}
