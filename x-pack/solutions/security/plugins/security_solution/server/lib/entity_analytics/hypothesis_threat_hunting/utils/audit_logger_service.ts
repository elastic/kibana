/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreAuditService, AuditEvent } from '@kbn/core/server';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { ThreatHuntingHypothesisActions } from '../auditing/actions';

export type ThreatHuntingHypothesesAuditLoggerService = ReturnType<
  typeof createThreatHuntingHypothesesAuditLoggerService
>;

export const createThreatHuntingHypothesesAuditLoggerService = (auditService: CoreAuditService) => {
  const auditLogger = auditService.withoutRequest; // assuming user never initiates these actions directly
  const log = (action: ThreatHuntingHypothesisActions, msg: string, error?: Error) => {
    const outcome = error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.UNKNOWN;

    const type =
      action === ThreatHuntingHypothesisActions.CREATE
        ? AUDIT_TYPE.CREATION
        : ThreatHuntingHypothesisActions.DELETE
        ? AUDIT_TYPE.DELETION
        : AUDIT_TYPE.CHANGE;

    const category = AUDIT_CATEGORY.DATABASE;

    const event: AuditEvent = {
      message: `[Hypotheses Threat Hunting] ${msg}`,
      event: {
        action: `hypotheses_threat_hunting_${action}`,
        category,
        outcome,
        type,
      },
    };
    return auditLogger?.log(event);
  };
  return {
    log,
  };
};
