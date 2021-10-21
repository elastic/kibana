/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldVisConfig } from '../../../../../plugins/data_visualizer/public/application/common/components/stats_table/types';

export interface MetricFieldVisConfig extends FieldVisConfig {
  statsMaxDecimalPlaces: number;
  docCountFormatted: string;
  topValuesCount: number;
  viewableInLens: boolean;
}

export interface NonMetricFieldVisConfig extends FieldVisConfig {
  docCountFormatted: string;
  exampleCount: number;
  exampleContent?: string[];
  viewableInLens: boolean;
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
