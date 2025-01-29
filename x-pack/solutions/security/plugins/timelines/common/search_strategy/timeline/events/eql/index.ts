/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import type { EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import type { RuntimeFieldSpec, RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import { EqlSearchResponse, Inspect, Maybe, PaginationInputPaginated } from '../../..';
import { TimelineEdges } from '../..';

export type RunTimeMappings =
  | Record<string, Omit<RuntimeFieldSpec, 'type'> & { type: RuntimePrimitiveTypes }>
  | undefined;

export interface TimelineEqlResponse extends EqlSearchStrategyResponse<EqlSearchResponse<unknown>> {
  edges: TimelineEdges[];
  totalCount: number;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  inspect: Maybe<Inspect>;
}

export interface EqlFieldsComboBoxOptions {
  keywordFields: EuiComboBoxOptionOption[];
  dateFields: EuiComboBoxOptionOption[];
  nonDateFields: EuiComboBoxOptionOption[];
}

export interface EqlOptions {
  eventCategoryField?: string;
  tiebreakerField?: string;
  timestampField?: string;
  query?: string;
  size?: number;
}

export type FieldsEqlOptions = keyof EqlOptions;
