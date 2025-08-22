/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AncestorLatest,
  DetectionAlert800,
  DetectionAlertLatest,
  DetectionAlertRead,
  WrappedAlert,
} from './schema';

import type { NewTermsAlertLatest } from './new_terms_alert_schema';

import type { EqlBuildingBlockAlertLatest, EqlShellAlertLatest } from './eql_alert_schema';

export type {
  AncestorLatest,
  DetectionAlert800,
  DetectionAlertLatest,
  DetectionAlertRead as DetectionAlert,
  EqlBuildingBlockAlertLatest,
  EqlShellAlertLatest,
  NewTermsAlertLatest,
  WrappedAlert,
};
