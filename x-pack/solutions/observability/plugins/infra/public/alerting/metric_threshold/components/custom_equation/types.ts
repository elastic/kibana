/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationType, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { MetricExpressionCustomMetric } from '../../../../../common/alerting/metrics';
import { MetricExpression } from '../../types';

export type CustomMetrics = MetricExpression['customMetrics'];

export interface AggregationTypes {
  [x: string]: AggregationType;
}

export interface NormalizedField {
  name: string;
  normalizedType: string;
}

export type NormalizedFields = NormalizedField[];

export interface MetricRowBaseProps {
  name: string;
  onAdd: () => void;
  onDelete: (name: string) => void;
  disableDelete: boolean;
  disableAdd: boolean;
  onChange: (metric: MetricExpressionCustomMetric) => void;
  aggregationTypes: AggregationTypes;
  errors: IErrorObject;
}
