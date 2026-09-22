/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/server';
import type { TransformGenerator } from '.';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  HistogramTransformGenerator,
  KQLCustomTransformGenerator,
  MetricCustomTransformGenerator,
  SyntheticsAvailabilityTransformGenerator,
  TimesliceMetricTransformGenerator,
} from '.';
import type { IndicatorTypes } from '../../domain/models';

export function createTransformGenerators(
  spaceId: string,
  dataViewsService: DataViewsService,
  isServerless: boolean,
  isCpsEnabled: boolean = false
): Record<IndicatorTypes, TransformGenerator> {
  return {
    'sli.apm.transactionDuration': new ApmTransactionDurationTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
    'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
    'sli.synthetics.availability': new SyntheticsAvailabilityTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
    'sli.kql.custom': new KQLCustomTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
    'sli.metric.custom': new MetricCustomTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
    'sli.histogram.custom': new HistogramTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
    'sli.metric.timeslice': new TimesliceMetricTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless,
      isCpsEnabled
    ),
  };
}
