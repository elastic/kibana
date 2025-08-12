/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuggestionType } from '@kbn/cases-plugin/public';
import React from 'react';
import type { SLOSuggestion } from '../../common/cases/suggestions';

export const sloSuggestionDefinition: SuggestionType<SLOSuggestion> = {
  id: 'slo',
  owner: 'observability',
  children: React.lazy(() => import('./suggestion_component')),
};
