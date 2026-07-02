/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AlertValidationWorkflowAuditActions {
  ALERT_VALIDATION_WORKFLOW_SETTINGS_UPDATE = 'alert_validation_workflow_settings_update',
}

export enum AUDIT_TYPE {
  CHANGE = 'change',
}

export enum AUDIT_CATEGORY {
  DATABASE = 'database',
}

export enum AUDIT_OUTCOME {
  FAILURE = 'failure',
  SUCCESS = 'success',
}
