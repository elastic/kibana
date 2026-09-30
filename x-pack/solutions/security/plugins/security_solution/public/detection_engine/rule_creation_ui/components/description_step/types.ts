/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase, Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';

export interface ListItems {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export interface BuildQueryBarDescription {
  field: string;
  filters: Filter[];
  filterManager: FilterManager;
  query: string;
  queryLanguage?: string;
  savedId: string;
  indexPatterns?: DataViewBase;
  queryLabel?: string;
  savedQueryName?: string;
}

export interface BuildThreatDescription {
  threat: Threats;
  /** Which MITRE framework's dataset resolves these entries' names and validity. */
  framework?: MitreFramework;
  'data-test-subj'?: string;
}
