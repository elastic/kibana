/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

import {
  auditAlertUpdateAuthorizationFailure,
  auditAlertUpdateFailure,
  auditAlertUpdateIntent,
  auditAlertUpdateResponseFailure,
  auditAlertUpdatePreOperationFailure,
  auditAlertWorkflowStatusChange,
} from './audit_alert_updates';

describe('auditAlertUpdates', () => {
  const ids = ['alert-1', 'alert-2'];
  const query = { term: { foo: 'bar' } };

  it('logs authorization denials as bulk alert_update failures', () => {
    const auditLogger = auditLoggerMock.create();

    auditAlertUpdateAuthorizationFailure(auditLogger);

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed attempt to update alerts because required privileges were not granted',
        event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
      })
    );
  });

  describe('auditAlertUpdateIntent', () => {
    it('logs one alert_update event per id with outcome unknown', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertUpdateIntent(auditLogger, { ids });

      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        message: 'User is updating alert [id=alert-1]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
        error: undefined,
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        message: 'User is updating alert [id=alert-2]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
        error: undefined,
      });
    });

    it('logs one bulk alert_update event with the stringified query in the message', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertUpdateIntent(auditLogger, { query });

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        message: `User is updating alerts. Bulk updating workflow status for alerts matching query: ${JSON.stringify(
          query
        )}`,
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
        error: undefined,
      });
    });

    it('does not throw when the audit logger is undefined', () => {
      expect(() => auditAlertUpdateIntent(undefined, { ids })).not.toThrow();
    });
  });

  describe('auditAlertUpdateFailure', () => {
    const error = new Error('update failed');

    it('logs one failure event per id', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertUpdateFailure(auditLogger, { ids }, error);

      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        message: 'Failed attempt to update alert [id=alert-1]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'failure',
        },
        error: {
          code: 'Error',
          message: 'update failed',
        },
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        message: 'Failed attempt to update alert [id=alert-2]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'failure',
        },
        error: {
          code: 'Error',
          message: 'update failed',
        },
      });
    });

    it('logs one bulk failure event with the stringified query in the message', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertUpdateFailure(auditLogger, { query }, error);

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        message: `Failed attempt to update alerts. Bulk updating workflow status for alerts matching query: ${JSON.stringify(
          query
        )}`,
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'failure',
        },
        error: {
          code: 'Error',
          message: 'update failed',
        },
      });
    });
  });

  describe('auditAlertWorkflowStatusChange', () => {
    it('logs one bulk alert_acknowledge event when an acknowledged update changed documents', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertWorkflowStatusChange(auditLogger, 'acknowledged', 1);

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        message: 'User has acknowledged alerts',
        event: {
          action: 'alert_acknowledge',
          category: ['database'],
          type: ['change'],
          outcome: 'success',
        },
        error: undefined,
      });
    });

    it('does not log an outcome when no document was updated', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertWorkflowStatusChange(auditLogger, 'open', 0);

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('does not log when status is closed', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertWorkflowStatusChange(auditLogger, 'closed', 1);

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('does not log when status is in-progress', () => {
      const auditLogger = auditLoggerMock.create();

      auditAlertWorkflowStatusChange(auditLogger, 'in-progress', 1);

      expect(auditLogger.log).not.toHaveBeenCalled();
    });
  });

  it('logs partial update failures returned by Elasticsearch', () => {
    const auditLogger = auditLoggerMock.create();

    expect(
      auditAlertUpdateResponseFailure(
        auditLogger,
        { ids },
        {
          failures: [{ cause: { reason: 'document rejected' }, status: 400 }],
          version_conflicts: 2,
        }
      )
    ).toBe(true);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
        error: expect.objectContaining({
          message: 'Alert update had 1 document failure(s), 2 version conflict(s)',
        }),
      })
    );
  });

  it('treats an Elasticsearch timeout response as a failure', () => {
    const auditLogger = auditLoggerMock.create();

    expect(auditAlertUpdateResponseFailure(auditLogger, { ids }, { timed_out: true })).toBe(true);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
        error: expect.objectContaining({ message: 'Alert update had request timed out' }),
      })
    );
  });

  it('logs a precondition failure before an update helper runs', () => {
    const auditLogger = auditLoggerMock.create();

    auditAlertUpdatePreOperationFailure(auditLogger, 'Alert update target unavailable');

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
        error: expect.objectContaining({ message: 'Alert update target unavailable' }),
      })
    );
  });

  it('logs an Error passed to the pre-operation helper as-is', () => {
    const auditLogger = auditLoggerMock.create();
    const error = new TypeError('search failed');

    auditAlertUpdatePreOperationFailure(auditLogger, error);

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
        error: expect.objectContaining({ code: 'TypeError', message: 'search failed' }),
      })
    );
  });
});
