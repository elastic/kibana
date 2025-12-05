/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, AuditEvent } from '@kbn/core/server';
import { AUDIT_OUTCOME, AUDIT_TYPE, AUDIT_CATEGORY } from '../audit';
import type { MonitoringEngineComponentResource } from '../../../../common/api/entity_analytics';
import { PrivilegeMonitoringEngineActions } from './auditing/actions';

export interface PrivMonAuditLogger {
  log: (
    action: PrivilegeMonitoringEngineActions,
    resource: MonitoringEngineComponentResource,
    msg: string,
    error?: Error
  ) => void;
}

export const createPrivMonAuditLogger = (auditLogger?: AuditLogger) => {
  return {
    log: (
      action: PrivilegeMonitoringEngineActions,
      resource: MonitoringEngineComponentResource,
      msg: string,
      error?: Error
    ) => {
      // NOTE: Excluding errors, all auditing events are currently WRITE events, meaning the outcome is always UNKNOWN.
      // This may change in the future, depending on the audit action.
      const outcome = error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.UNKNOWN;

      const type =
        action === PrivilegeMonitoringEngineActions.CREATE
          ? AUDIT_TYPE.CREATION
          : PrivilegeMonitoringEngineActions.DELETE
          ? AUDIT_TYPE.DELETION
          : AUDIT_TYPE.CHANGE;

      const category = AUDIT_CATEGORY.DATABASE;

      const message = error ? `${msg}: ${error.message}` : msg;
      const event: AuditEvent = {
        message: `[Privilege Monitoring] ${message}`,
        event: {
          action: `${action}_${resource}`,
          category,
          outcome,
          type,
        },
      };

      return auditLogger?.log(event);
    },
  };
};
