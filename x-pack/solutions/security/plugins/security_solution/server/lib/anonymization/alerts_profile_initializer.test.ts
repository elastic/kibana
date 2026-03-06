/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ALERTS_DATA_VIEW_TARGET_TYPE,
  getAlertsDataViewTargetId,
  securityAlertsProfileInitializer,
} from './alerts_profile_initializer';
import { getDefaultAlertFieldRules } from './default_field_rules';

describe('securityAlertsProfileInitializer', () => {
  const logger = loggingSystemMock.createLogger();
  const findProfileByTarget = jest.fn();
  const createProfile = jest.fn();
  const ensureSalt = jest.fn().mockResolvedValue('salt-value');
  const checkDataViewExists = jest.fn().mockResolvedValue(true);

  const createContext = (namespace = 'default') => ({
    namespace,
    target: {
      type: ALERTS_DATA_VIEW_TARGET_TYPE,
      id: getAlertsDataViewTargetId(namespace),
    },
    logger,
    findProfileByTarget,
    createProfile,
    ensureSalt,
    checkDataViewExists,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    checkDataViewExists.mockResolvedValue(true);
  });

  it('matches alerts data view targets only', () => {
    expect(
      securityAlertsProfileInitializer.shouldInitialize({
        namespace: 'default',
        target: {
          type: ALERTS_DATA_VIEW_TARGET_TYPE,
          id: getAlertsDataViewTargetId('default'),
        },
      })
    ).toBe(true);
  });

  it('creates a profile when none exists', async () => {
    findProfileByTarget.mockResolvedValue(null);
    createProfile.mockResolvedValue({ id: 'test-id' });

    await securityAlertsProfileInitializer.initialize(createContext());

    expect(createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Security Alerts Anonymization Profile',
        targetType: ALERTS_DATA_VIEW_TARGET_TYPE,
        targetId: getAlertsDataViewTargetId('default'),
        namespace: 'default',
        createdBy: 'system',
        rules: {
          fieldRules: getDefaultAlertFieldRules(),
          regexRules: [],
          nerRules: [],
        },
      })
    );
  });

  it('uses namespace-specific alerts data view target IDs', async () => {
    findProfileByTarget.mockResolvedValue(null);
    createProfile.mockResolvedValue({ id: 'test-id-security' });

    await securityAlertsProfileInitializer.initialize(createContext('security'));

    expect(findProfileByTarget).toHaveBeenCalledWith(
      ALERTS_DATA_VIEW_TARGET_TYPE,
      getAlertsDataViewTargetId('security')
    );
  });

  it('does not create a profile when one already exists', async () => {
    findProfileByTarget.mockResolvedValue({ id: 'existing' });

    await securityAlertsProfileInitializer.initialize(createContext());

    expect(createProfile).not.toHaveBeenCalled();
  });

  it('does not create a profile when the alerts data view does not exist', async () => {
    checkDataViewExists.mockResolvedValue(false);

    await securityAlertsProfileInitializer.initialize(createContext());

    expect(findProfileByTarget).not.toHaveBeenCalled();
  });

  it('handles concurrent creation gracefully (409 conflict)', async () => {
    findProfileByTarget.mockResolvedValue(null);
    const conflictError = new Error('conflict');
    (conflictError as { statusCode?: number }).statusCode = 409;
    createProfile.mockRejectedValue(conflictError);

    await expect(
      securityAlertsProfileInitializer.initialize(createContext())
    ).resolves.toBeUndefined();
  });

  it('rethrows non-409 errors', async () => {
    findProfileByTarget.mockResolvedValue(null);
    createProfile.mockRejectedValue(new Error('boom'));

    await expect(securityAlertsProfileInitializer.initialize(createContext())).rejects.toThrow(
      'boom'
    );
  });
});
