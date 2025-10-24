/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch } from 'redux';
import type { Filter, Query } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { InputsModelId } from './constants';
import type { URL_PARAM_KEY } from '../../hooks/use_url_state';
import type { VisualizationTablesWithMeta } from '../../components/visualization_actions/types';

export interface AbsoluteTimeRange {
  kind: 'absolute';
  fromStr?: string;
  toStr?: string;
  from: string;
  to: string;
}

export interface RelativeTimeRange {
  kind: 'relative';
  fromStr: string;
  toStr: string;
  from: string;
  to: string;
}

export const isRelativeTimeRange = (
  timeRange: RelativeTimeRange | AbsoluteTimeRange | URLTimeRange
): timeRange is RelativeTimeRange => timeRange.kind === 'relative';

export const isAbsoluteTimeRange = (
  timeRange: RelativeTimeRange | AbsoluteTimeRange | URLTimeRange
): timeRange is AbsoluteTimeRange => timeRange.kind === 'absolute';

export type TimeRange = AbsoluteTimeRange | RelativeTimeRange;

export type URLTimeRange = TimeRange;

export interface Policy {
  kind: 'manual' | 'interval';
  duration: number; // in ms
}

export type RefetchKql = (dispatch: Dispatch) => boolean;
export type Refetch = () => void;

export interface InspectQuery {
  dsl: string[];
  response: string[];
}

export interface GlobalGenericQuery {
  inspect: InspectQuery | null;
  isInspected: boolean;
  loading: boolean;
  selectedInspectIndex: number;
  invalidKqlQuery?: Error;
  searchSessionId?: string;
  tables?: VisualizationTablesWithMeta;
}

export interface GlobalKqlQuery extends GlobalGenericQuery {
  id: string;
  refetch: Refetch | RefetchKql | null;
}

export type GlobalQuery = GlobalKqlQuery;

export interface InputsRange {
  timerange: TimeRange;
  policy: Policy;
  queries: GlobalQuery[];
  linkTo: InputsModelId[];
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  fullScreen?: boolean;
}

export interface LinkTo {
  linkTo: InputsModelId[];
}
export type InputsRangeTimeOnly = Pick<InputsRange, 'timerange' | 'linkTo' | 'policy'>;

export type Inputs = InputsRange | InputsRangeTimeOnly;

export interface InputsModel {
  global: InputsRange;
  timeline: InputsRange;
  valueReport: InputsRangeTimeOnly;
}
export interface UrlInputsModelInputs {
  linkTo: InputsModelId[];
  [URL_PARAM_KEY.timerange]: TimeRange;
}
export interface UrlInputsModel {
  global: UrlInputsModelInputs;
  timeline: UrlInputsModelInputs;
  valueReport: UrlInputsModelInputs;
}
