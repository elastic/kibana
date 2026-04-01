/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';

export const WIRED_OTEL_DATA_VIEW_SPEC: DataViewSpec = {
  title: 'logs.otel,logs.otel.*',
  timeFieldName: '@timestamp',
};

export const WIRED_ECS_DATA_VIEW_SPEC: DataViewSpec = {
  title: 'logs.ecs,logs.ecs.*',
  timeFieldName: '@timestamp',
};
