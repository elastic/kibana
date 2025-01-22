/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent, EcsEvent } from '@kbn/core/server';
import type { ArrayElement } from '@kbn/utility-types';

export enum SiemMigrationsAuditActions {
  SIEM_MIGRATION_STARTED = 'siem_migration_started',
  SIEM_MIGRATION_STOPPED = 'siem_migration_stopped',
  SIEM_MIGRATION_CREATED = 'siem_migration_created',
  SIEM_MIGRATION_UPDATED = 'siem_migration_updated',
  SIEM_MIGRATION_CREATED_LOOKUP = 'siem_migration_created_lookup',
  SIEM_MIGRATION_INSTALLED_RULE = 'siem_migration_installed_rule',
  SIEM_MIGRATION_UPDATED_RULE = 'siem_migration_updated_rule',
}

export enum AUDIT_TYPE {
  CHANGE = 'change',
  START = 'start',
  END = 'end',
  ACCESS = 'access',
  CREATION = 'creation',
}

export enum AUDIT_CATEGORY {
  API = 'api',
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  WEB = 'web',
}

export enum AUDIT_OUTCOME {
  FAILURE = 'failure',
  SUCCESS = 'success',
  UNKNOWN = 'unknown',
}

export const siemMigrationAuditEventType: Record<
  SiemMigrationsAuditActions,
  ArrayElement<EcsEvent['type']>
> = {
  siem_migration_started: AUDIT_TYPE.START,
  siem_migration_stopped: AUDIT_TYPE.END,
  siem_migration_created: AUDIT_TYPE.CREATION,
  siem_migration_updated: AUDIT_TYPE.CHANGE,
  siem_migration_installed_rule: AUDIT_TYPE.CREATION,
  siem_migration_updated_rule: AUDIT_TYPE.CHANGE,
  siem_migration_created_lookup: AUDIT_TYPE.CREATION,
};

export const siemMigrationAuditEventMessage: Record<SiemMigrationsAuditActions, string> = {
  siem_migration_started: 'User started an existing SIEM migration',
  siem_migration_stopped: 'User stopped an existing SIEM migration',
  siem_migration_created: 'User created a new SIEM migration',
  siem_migration_updated: 'User updated an existing SIEM migration',
  siem_migration_installed_rule: 'User installed a new detection rule through SIEM migration',
  siem_migration_updated_rule: 'User updated a translated detection rule',
  siem_migration_created_lookup: 'User uploaded a new lookup list through SIEM migration',
};

export interface SiemMigrationAuditEvent {
  action: SiemMigrationsAuditActions;
  error?: Error;
  id?: string;
}

export function siemMigrationAuditEvent({
  action,
  error,
  id,
}: SiemMigrationAuditEvent): AuditEvent {
  const type = siemMigrationAuditEventType[action];
  let message = siemMigrationAuditEventMessage[action];
  if (id) {
    message += ` with [id=${id}]`;
  }
  return {
    message,
    event: {
      action,
      category: [AUDIT_CATEGORY.DATABASE],
      type: type ? [type] : undefined,
      outcome: error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.SUCCESS,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
