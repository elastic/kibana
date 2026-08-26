/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { enforceEmbeddedAlertIds } from '.';

const getLogger = (): Logger =>
  ({
    warn: jest.fn(),
  } as unknown as Logger);

describe('enforceEmbeddedAlertIds', () => {
  describe('when alerts and alertIds are aligned (same length)', () => {
    it('prepends the backing _id to alerts that do not already embed it', () => {
      const result = enforceEmbeddedAlertIds({
        alertIds: ['id-1', 'id-2'],
        alerts: ['[ALERT] rule="one"', '[ALERT] rule="two"'],
      });

      expect(result).toEqual(['_id,id-1\n[ALERT] rule="one"', '_id,id-2\n[ALERT] rule="two"']);
    });

    it('leaves alerts that already embed their backing _id unchanged (no double prefix)', () => {
      const result = enforceEmbeddedAlertIds({
        alertIds: ['id-1', 'id-2'],
        alerts: ['_id,id-1\n[ALERT] rule="one"', '[ALERT] rule="two"'],
      });

      expect(result).toEqual(['_id,id-1\n[ALERT] rule="one"', '_id,id-2\n[ALERT] rule="two"']);
    });

    it('does not log a warning when ids can be enforced', () => {
      const logger = getLogger();

      enforceEmbeddedAlertIds({
        alertIds: ['id-1'],
        alerts: ['[ALERT] rule="one"'],
        logger,
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('when alerts and alertIds are NOT aligned (different lengths)', () => {
    it('returns the alerts unchanged (cannot positionally map ids)', () => {
      const alerts = ['_id,id-1\n[ALERT] rule="one"', '[ALERT] rule="two"', '[ALERT] rule="three"'];

      const result = enforceEmbeddedAlertIds({
        alertIds: ['id-1', 'id-2'],
        alerts,
      });

      expect(result).toEqual(alerts);
    });

    it('logs a warning identifying how many alerts lack an embedded _id', () => {
      const logger = getLogger();

      enforceEmbeddedAlertIds({
        alertIds: ['id-1', 'id-2'],
        alerts: ['_id,id-1\n[ALERT] rule="one"', '[ALERT] rule="two"', '[ALERT] rule="three"'],
        logger,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect((logger.warn as jest.Mock).mock.calls[0][0]).toContain('2');
    });
  });

  describe('when no alertIds are available', () => {
    it('returns the alerts unchanged', () => {
      const alerts = ['[ALERT] rule="one"', '[ALERT] rule="two"'];

      const result = enforceEmbeddedAlertIds({ alertIds: [], alerts });

      expect(result).toEqual(alerts);
    });

    it('logs a warning when alerts lack an embedded _id', () => {
      const logger = getLogger();

      enforceEmbeddedAlertIds({
        alertIds: [],
        alerts: ['[ALERT] rule="one"'],
        logger,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('does not log a warning when every alert already embeds an _id', () => {
      const logger = getLogger();

      enforceEmbeddedAlertIds({
        alertIds: [],
        alerts: ['_id,id-1\n[ALERT] rule="one"'],
        logger,
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  it('returns an empty array when there are no alerts', () => {
    expect(enforceEmbeddedAlertIds({ alertIds: [], alerts: [] })).toEqual([]);
  });
});
