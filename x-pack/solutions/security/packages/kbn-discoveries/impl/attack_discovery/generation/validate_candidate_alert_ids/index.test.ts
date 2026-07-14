/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { validateCandidateAlertIds } from '.';

const getLogger = (): Logger =>
  ({
    warn: jest.fn(),
  } as unknown as Logger);

describe('validateCandidateAlertIds', () => {
  it('keeps candidates that carry a recoverable backing _id', () => {
    const { validCandidates } = validateCandidateAlertIds({
      alerts: ['_id,id-1\nhost.name,web-01', '_id,id-2\nhost.name,web-02'],
    });

    expect(validCandidates).toEqual([
      { alert: '_id,id-1\nhost.name,web-01', id: 'id-1' },
      { alert: '_id,id-2\nhost.name,web-02', id: 'id-2' },
    ]);
  });

  it('rejects candidates that lack a recoverable _id', () => {
    const { rejectedAlerts } = validateCandidateAlertIds({
      alerts: ['_id,id-1\nhost.name,web-01', 'host.name,web-02'],
    });

    expect(rejectedAlerts).toEqual(['host.name,web-02']);
  });

  it('forwards the original alert bytes unchanged for valid candidates', () => {
    const original = '_id,id-1\nhost.name,web-01\nuser.name,root';

    const { validCandidates } = validateCandidateAlertIds({ alerts: [original] });

    expect(validCandidates[0].alert).toBe(original);
  });

  it('logs a warning identifying how many candidates were rejected', () => {
    const logger = getLogger();

    validateCandidateAlertIds({
      alerts: ['_id,id-1\nhost.name,web-01', 'host.name,web-02', 'user.name,root'],
      logger,
    });

    expect((logger.warn as jest.Mock).mock.calls[0][0]).toContain('2 of 3');
  });

  it('does not log a warning when every candidate carries an _id', () => {
    const logger = getLogger();

    validateCandidateAlertIds({ alerts: ['_id,id-1\nhost.name,web-01'], logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns empty results for an empty candidate set', () => {
    expect(validateCandidateAlertIds({ alerts: [] })).toEqual({
      rejectedAlerts: [],
      validCandidates: [],
    });
  });
});
