/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectReference } from '@kbn/core/server';

// eslint-disable-next-line no-restricted-imports
import { legacyInjectRuleIdReferences } from './legacy_inject_rule_id_references';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesNotificationParams } from '../legacy_types';

describe('legacy_inject_rule_id_references', () => {
  type FuncReturn = ReturnType<typeof legacyInjectRuleIdReferences>;
  let logger = loggingSystemMock.create().get('security_solution');
  const mockSavedObjectReferences = (): SavedObjectReference[] => [
    {
      id: '123',
      name: 'alert_0',
      type: 'alert',
    },
  ];

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('returns parameters from the saved object if found', () => {
    expect(
      legacyInjectRuleIdReferences({
        logger,
        ruleAlertId: '123',
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>('123');
  });

  test('returns parameters from the saved object if "ruleAlertId" is undefined', () => {
    expect(
      legacyInjectRuleIdReferences({
        logger,
        ruleAlertId: undefined as unknown as LegacyRulesNotificationParams['ruleAlertId'],
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>('123');
  });

  test('prefers to use saved object references if the two are different from each other', () => {
    expect(
      legacyInjectRuleIdReferences({
        logger,
        ruleAlertId: '456',
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>('123');
  });

  test('returns sent in "ruleAlertId" if the saved object references is empty', () => {
    expect(
      legacyInjectRuleIdReferences({
        logger,
        ruleAlertId: '456',
        savedObjectReferences: [],
      })
    ).toEqual<FuncReturn>('456');
  });

  test('does not log an error if it returns parameters from the saved object when found', () => {
    legacyInjectRuleIdReferences({
      logger,
      ruleAlertId: '123',
      savedObjectReferences: mockSavedObjectReferences(),
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('logs an error if the saved object references is empty', () => {
    legacyInjectRuleIdReferences({
      logger,
      ruleAlertId: '123',
      savedObjectReferences: [],
    });
    expect(logger.error).toBeCalledWith(
      'The saved object reference was not found for the "ruleAlertId" when we were expecting to find it. Kibana migrations might not have run correctly or someone might have removed the saved object references manually. Returning the last known good "ruleAlertId" which might not work. "ruleAlertId" with its id being returned is: 123'
    );
  });
});
