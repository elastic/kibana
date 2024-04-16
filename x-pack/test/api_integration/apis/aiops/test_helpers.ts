/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';

export const getAddSignificationItemsActions = (data: any[], apiVersion: ApiVersion) =>
  data.filter(
    (d) => d.type === (apiVersion === '1' ? 'add_significant_terms' : 'add_significant_items')
  );

export const getHistogramActions = (data: any[], apiVersion: ApiVersion) =>
  data.filter(
    (d) =>
      d.type ===
      (apiVersion === '1' ? 'add_significant_terms_histogram' : 'add_significant_items_histogram')
  );

export const getGroupActions = (data: any[], apiVersion: ApiVersion) =>
  data.filter(
    (d) =>
      d.type ===
      (apiVersion === '1' ? 'add_significant_terms_group' : 'add_significant_items_group')
  );

export const getGroupHistogramActions = (data: any[], apiVersion: ApiVersion) =>
  data.filter(
    (d) =>
      d.type ===
      (apiVersion === '1'
        ? 'add_significant_terms_group_histogram'
        : 'add_significant_items_group_histogram')
  );

export const getErrorActions = (data: any[]) => data.filter((d) => d.type === 'add_error');
