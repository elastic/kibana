/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';
import type { SecurityCellActionMetadata } from '../../../../../app/actions/types';

export enum AppEventTypes {
  CellActionClicked = 'Cell Action Clicked',
  BreadcrumbClicked = 'Breadcrumb Clicked',
}

interface ReportCellActionClickedParams {
  metadata: SecurityCellActionMetadata | undefined;
  displayName: string;
  actionId: string;
  fieldName: string;
}

interface ReportBreadcrumbClickedParams {
  title: string;
}

export interface AppTelemetryEventsMap {
  [AppEventTypes.CellActionClicked]: ReportCellActionClickedParams;
  [AppEventTypes.BreadcrumbClicked]: ReportBreadcrumbClickedParams;
}

export interface AppTelemetryEvent {
  eventType: AppEventTypes;
  schema: RootSchema<AppTelemetryEventsMap[AppEventTypes]>;
}
