/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum BulkFillRuleGapsEventTypes {
  BulkFillRuleGapsOpenModal = 'Bulk fill rule gaps Open Modal',
  BulkFillRuleGapsExecute = 'Bulk fill rule gaps Execute',
}
interface ReportBulkFillRuleGapsOpenModalParams {
  type: 'single' | 'bulk';
}

interface ReportBulkFillRuleGapsExecuteParams {
  rangeInMs: number;
  rulesCount: number;
  status: 'success' | 'error';
}

export interface BulkFillRuleGapsTelemetryEventsMap {
  [BulkFillRuleGapsEventTypes.BulkFillRuleGapsOpenModal]: ReportBulkFillRuleGapsOpenModalParams;
  [BulkFillRuleGapsEventTypes.BulkFillRuleGapsExecute]: ReportBulkFillRuleGapsExecuteParams;
}

export interface BulkFillRuleGapsTelemetryEvent {
  eventType: BulkFillRuleGapsEventTypes;
  schema: RootSchema<BulkFillRuleGapsTelemetryEventsMap[BulkFillRuleGapsEventTypes]>;
}
