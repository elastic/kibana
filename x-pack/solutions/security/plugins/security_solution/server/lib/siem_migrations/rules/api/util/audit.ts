/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, EcsEvent } from '@kbn/core/server';
import type { ArrayElement } from '@kbn/utility-types';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';

export enum SiemMigrationsAuditActions {
  SIEM_MIGRATION_CREATED = 'siem_migration_created',
  SIEM_MIGRATION_RETRIEVED = 'siem_migration_retrieved',
  SIEM_MIGRATION_UPLOADED_RESOURCES = 'siem_migration_uploaded_resources',
  SIEM_MIGRATION_RETRIEVED_RESOURCES = 'siem_migration_retrieved_resources',
  SIEM_MIGRATION_STARTED = 'siem_migration_started',
  SIEM_MIGRATION_STOPPED = 'siem_migration_stopped',
  SIEM_MIGRATION_UPDATED_RULE = 'siem_migration_updated_rule',
  SIEM_MIGRATION_INSTALLED_RULES = 'siem_migration_installed_rules',
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
  [SiemMigrationsAuditActions.SIEM_MIGRATION_CREATED]: AUDIT_TYPE.CREATION,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED]: AUDIT_TYPE.ACCESS,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_UPLOADED_RESOURCES]: AUDIT_TYPE.CREATION,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED_RESOURCES]: AUDIT_TYPE.ACCESS,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_STARTED]: AUDIT_TYPE.START,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_STOPPED]: AUDIT_TYPE.END,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_UPDATED_RULE]: AUDIT_TYPE.CHANGE,
  [SiemMigrationsAuditActions.SIEM_MIGRATION_INSTALLED_RULES]: AUDIT_TYPE.CREATION,
};

interface SiemMigrationAuditEvent {
  action: SiemMigrationsAuditActions;
  message: string;
  error?: Error;
}

export class SiemMigrationAuditLogger {
  private auditLogger?: AuditLogger | null = null;
  constructor(
    private readonly securitySolutionContextPromise: Promise<SecuritySolutionApiRequestHandlerContext>
  ) {}

  private setAuditLogger = async (): Promise<boolean> => {
    if (this.auditLogger === null) {
      const securitySolutionContext = await this.securitySolutionContextPromise;
      this.auditLogger = securitySolutionContext.getAuditLogger();
    }
    return !!this.auditLogger;
  };

  private logEvent = ({ action, message, error }: SiemMigrationAuditEvent): void => {
    const type = siemMigrationAuditEventType[action];
    this.auditLogger?.log({
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
    });
  };

  private async log(event: SiemMigrationAuditEvent | SiemMigrationAuditEvent[]): Promise<void> {
    const auditLoggerSet = await this.setAuditLogger();
    if (!auditLoggerSet) {
      // Audit logger is not available
      return;
    }

    if (Array.isArray(event)) {
      event.forEach((e) => this.logEvent(e));
    } else {
      this.logEvent(event);
    }
  }

  public async logCreateMigration(params: { migrationId: string; error?: Error }): Promise<void> {
    const { migrationId, error } = params;
    const message = `User created a new SIEM migration with [id=${migrationId}]`;
    return this.log({
      action: SiemMigrationsAuditActions.SIEM_MIGRATION_CREATED,
      message,
      error,
    });
  }

  public async logGetMigration(params: { migrationId: string; error?: Error }): Promise<void> {
    const { migrationId, error } = params;
    const message = `User retrieved the SIEM migration with [id=${migrationId}]`;
    return this.log({
      action: SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED,
      message,
      error,
    });
  }

  public async logUploadResources(params: { migrationId: string; error?: Error }): Promise<void> {
    const { migrationId, error } = params;
    const message = `User uploaded resources to the SIEM migration with [id=${migrationId}]`;
    return this.log({
      action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPLOADED_RESOURCES,
      message,
      error,
    });
  }

  public async logGetResources(params: { migrationId: string; error?: Error }): Promise<void> {
    const { migrationId, error } = params;
    const message = `User retrieved resources from the SIEM migration with [id=${migrationId}]`;
    return this.log({
      action: SiemMigrationsAuditActions.SIEM_MIGRATION_RETRIEVED_RESOURCES,
      message,
      error,
    });
  }

  public async logStart(params: { migrationId: string; error?: Error }): Promise<void> {
    const { migrationId, error } = params;
    const message = `User stopped the SIEM rules migration with [id=${migrationId}]`;
    return this.log({ action: SiemMigrationsAuditActions.SIEM_MIGRATION_STARTED, message, error });
  }

  public async logStop(params: { migrationId: string; error?: Error }): Promise<void> {
    const { migrationId, error } = params;
    const message = `User stopped the SIEM rules migration with [id=${migrationId}]`;
    return this.log({ action: SiemMigrationsAuditActions.SIEM_MIGRATION_STOPPED, message, error });
  }

  public async logUpdateRules(params: {
    migrationId: string;
    ids: string[];
    error?: Error;
  }): Promise<void> {
    const { ids, migrationId, error } = params;
    const events = ids.map<SiemMigrationAuditEvent>((id) => {
      const message = `User updated a translated rule through SIEM migration with [id=${id}, migration_id=${migrationId}]`;
      return { action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPDATED_RULE, message, error };
    });
    return this.log(events);
  }

  public async logInstallRules(params: {
    migrationId: string;
    ids?: string[];
    error?: Error;
  }): Promise<void> {
    const { ids, migrationId, error } = params;
    const action = SiemMigrationsAuditActions.SIEM_MIGRATION_INSTALLED_RULES;
    const events: SiemMigrationAuditEvent[] = [];
    if (ids) {
      ids.forEach((id) => {
        const message = `User installed a translated rule through SIEM migration with [id=${id}, migration_id=${migrationId}]`;
        events.push({ action, message, error });
      });
    } else {
      const message = `User installed all installable translated rules through SIEM migration with [migration_id=${migrationId}]`;
      events.push({ action, message, error });
    }
    return this.log(events);
  }
}
