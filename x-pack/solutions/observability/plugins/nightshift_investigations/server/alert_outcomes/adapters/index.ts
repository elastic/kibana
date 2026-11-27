/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertOutcomeSource } from '../types';
import { elasticAlertsAdapter } from './elastic';
import type { ProviderAdapter } from './types';

export type { AdapterContext, ProviderAdapter } from './types';
export { ELASTICSEARCH_CONNECTOR_TYPE_ID } from './elastic';

const ADAPTERS: ReadonlyMap<AlertOutcomeSource, ProviderAdapter> = new Map([
  [elasticAlertsAdapter.source, elasticAlertsAdapter],
]);

export const getProviderAdapter = (source: AlertOutcomeSource): ProviderAdapter | undefined =>
  ADAPTERS.get(source);
