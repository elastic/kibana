/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldVisConfig } from '../../../../../plugins/data_visualizer/public/application/common/components/stats_table/types';

export interface MetricFieldVisConfig extends FieldVisConfig {
  fieldName: string;
  statsMaxDecimalPlaces: number;
  docCountFormatted: string;
  topValuesCount: number;
  viewableInLens: boolean;
  hasActionMenu?: boolean;
}

export interface NonMetricFieldVisConfig extends FieldVisConfig {
  fieldName: string;
  docCountFormatted: string;
  exampleCount: number;
  exampleContent?: string[];
  viewableInLens: boolean;
  hasActionMenu?: boolean;
}

export interface TestData {
  suiteTitle: string;
  isSavedSearch?: boolean;
  sourceIndexOrSavedSearch: string;
  fieldNameFilters: string[];
  fieldTypeFilters: string[];
  rowsPerPage?: 10 | 25 | 50;
  sampleSizeValidations: Array<{
    size: number;
    expected: { field: string; docCountFormatted: string };
  }>;
  expected: {
    filters?: Array<{
      key: string;
      value: string;
      enabled?: boolean;
      pinned?: boolean;
      negated?: boolean;
    }>;
    totalDocCountFormatted: string;
    metricFields?: MetricFieldVisConfig[];
    nonMetricFields?: NonMetricFieldVisConfig[];
    emptyFields: string[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
    fieldNameFiltersResultCount: number;
    fieldTypeFiltersResultCount: number;
  };
}
