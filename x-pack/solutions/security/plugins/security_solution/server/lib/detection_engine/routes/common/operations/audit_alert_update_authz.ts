/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceSetup, KibanaRequest } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import {
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
  DETECTION_ENGINE_ALERT_TAGS_URL,
  DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
  DETECTION_ENGINE_ATTACKS_STATUS_URL,
  DETECTION_ENGINE_ATTACKS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../../../common/constants';
import { auditAlertUpdateAuthorizationFailure } from './audit_alert_updates';

const alertUpdateRoutes = new Set<string>([
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
  DETECTION_ENGINE_ALERT_TAGS_URL,
  DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
  DETECTION_ENGINE_ATTACKS_STATUS_URL,
  DETECTION_ENGINE_ATTACKS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
]);

/** Matches a route authorization rejection for an alert update endpoint. */
export const isAlertUpdateAuthorizationFailure = (
  request: AlertUpdateAuthorizationRequest,
  statusCode: number
): boolean =>
  statusCode === 403 &&
  request.route.method === 'post' &&
  request.authzResult === undefined &&
  alertUpdateRoutes.has(request.route.path);

/** Audits only pre-handler authorization rejections for alert update routes. */
export const auditAlertUpdateAuthorizationFailureIfNeeded = (
  request: AlertUpdateAuthorizationRequest,
  statusCode: number,
  getAuditLogger: () => AuditLogger | undefined
): void => {
  if (isAlertUpdateAuthorizationFailure(request, statusCode)) {
    auditAlertUpdateAuthorizationFailure(getAuditLogger());
  }
};

/** Registers an on-pre-response hook that audits alert update authorization rejections. */
export const registerAlertUpdateAuthorizationAudit = ({
  http,
  getAuditLogger,
}: {
  http: Pick<HttpServiceSetup, 'registerOnPreResponse'>;
  getAuditLogger: (request: KibanaRequest) => AuditLogger | undefined;
}): void => {
  http.registerOnPreResponse((request, preResponse, toolkit) => {
    auditAlertUpdateAuthorizationFailureIfNeeded(request, preResponse.statusCode, () =>
      getAuditLogger(request)
    );
    return toolkit.next();
  });
};

interface AlertUpdateAuthorizationRequest {
  authzResult?: Record<string, boolean>;
  route: { method: string; path: string };
}
