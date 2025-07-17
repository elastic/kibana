/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SuggestionDefinitionPublic } from '@kbn/observability-case-suggestion-registry-plugin/public';

const LazyLoadedSuggestionChildren = React.lazy(
  () => import('./synthetics_monitor_suggestion_children')
);

export const syntheticsMonitorSuggestionType: SuggestionDefinitionPublic = {
  suggestionId: 'synthetics_monitor',
  displayName: 'Synthetics Monitor',
  description: 'Suggests creating a case for Synthetics monitor issues',
  children: LazyLoadedSuggestionChildren,
} as const;
