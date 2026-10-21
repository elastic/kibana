/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

import { DETECTION_ENGINE_ALERT_TAGS_URL } from '../../../../../../common/constants';
import {
  auditAlertUpdateAuthorizationFailureIfNeeded,
  isAlertUpdateAuthorizationFailure,
  registerAlertUpdateAuthorizationAudit,
} from './audit_alert_update_authz';

describe('isAlertUpdateAuthorizationFailure', () => {
  const request = {
    route: { method: 'post' as const, path: DETECTION_ENGINE_ALERT_TAGS_URL },
  };

  it('matches a 403 before route authorization completed', () => {
    expect(isAlertUpdateAuthorizationFailure(request, 403)).toBe(true);
  });

  it('audits one denied request and skips a handler-side 403 response', () => {
    const auditLogger = auditLoggerMock.create();
    const getAuditLogger = jest.fn(() => auditLogger);

    auditAlertUpdateAuthorizationFailureIfNeeded(request, 403, getAuditLogger);
    auditAlertUpdateAuthorizationFailureIfNeeded(request, 400, getAuditLogger);
    auditAlertUpdateAuthorizationFailureIfNeeded(
      { ...request, authzResult: { alerts_api_update: true } },
      403,
      getAuditLogger
    );

    expect(getAuditLogger).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
      })
    );
  });

  it('does not match a handler response or an authorized request', () => {
    expect(isAlertUpdateAuthorizationFailure(request, 400)).toBe(false);
    expect(
      isAlertUpdateAuthorizationFailure(
        { ...request, authzResult: { alerts_api_update: false } },
        403
      )
    ).toBe(false);
  });

  it('does not match other routes', () => {
    expect(
      isAlertUpdateAuthorizationFailure({ route: { method: 'post', path: '/unrelated' } }, 403)
    ).toBe(false);
  });
});

describe('registerAlertUpdateAuthorizationAudit', () => {
  const request = httpServerMock.createKibanaRequest({
    method: 'post',
    path: DETECTION_ENGINE_ALERT_TAGS_URL,
  });

  const setup = () => {
    const auditLogger = auditLoggerMock.create();
    const http = { registerOnPreResponse: jest.fn() };
    registerAlertUpdateAuthorizationAudit({ http, getAuditLogger: () => auditLogger });
    const [handler] = http.registerOnPreResponse.mock.calls[0];
    return { auditLogger, handler };
  };

  it('audits a 403 and continues the response', () => {
    const { auditLogger, handler } = setup();
    const toolkit = { next: jest.fn() };

    handler(request, { statusCode: 403 }, toolkit);

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
  });

  it('does not audit a 200 but continues the response', () => {
    const { auditLogger, handler } = setup();
    const toolkit = { next: jest.fn() };

    handler(request, { statusCode: 200 }, toolkit);

    expect(auditLogger.log).not.toHaveBeenCalled();
    expect(toolkit.next).toHaveBeenCalledTimes(1);
  });
});
