/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query, TimeRange } from '@kbn/es-query';
import { SerializableRecord } from '@kbn/utility-types';

export interface ActionDocument {
  ruleType: string;
  alertDetailsUrl: string;
  reason: string;
  value: string;
  viewInAppUrl: string;
  host?: string;
  group?: string;
}

export interface LogsExplorerLocatorParsedParams extends SerializableRecord {
  dataset: string;
  timeRange: TimeRange;
  query: Query;
}
