/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomBulkAction } from '../../../../../common/types';
import type { AlertWorkflowStatus } from '../../../types';

export interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: OnUpdateAlertStatusSuccess;
  onAlertStatusActionFailure?: OnUpdateAlertStatusError;
  customBulkActions?: CustomBulkAction[];
}

export type OnUpdateAlertStatusSuccess = (
  updated: number,
  conflicts: number,
  status: AlertWorkflowStatus
) => void;
export type OnUpdateAlertStatusError = (status: AlertWorkflowStatus, error: Error) => void;

export type BulkActionsProp = boolean | BulkActionsObjectProp;
