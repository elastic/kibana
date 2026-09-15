/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EventKind {
  alert = 'alert',
  asset = 'asset',
  enrichment = 'enrichment',
  event = 'event',
  metric = 'metric',
  state = 'state',
  pipeline_error = 'pipeline_error',
  signal = 'signal',
}
