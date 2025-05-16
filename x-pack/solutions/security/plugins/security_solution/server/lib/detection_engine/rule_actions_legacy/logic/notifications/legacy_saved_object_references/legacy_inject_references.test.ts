/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectReference } from '@kbn/core/server';

// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesNotificationParams } from '../legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyInjectReferences } from './legacy_inject_references';

describe('legacy_inject_references', () => {
  type FuncReturn = ReturnType<typeof legacyInjectReferences>;
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

  test('returns parameters from a saved object if found', () => {
    const params: LegacyRulesNotificationParams = {
      ruleAlertId: '123',
    };

    expect(
      legacyInjectReferences({
        logger,
        params,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(params);
  });

  test('returns parameters from the saved object if found with a different saved object reference id', () => {
    const params: LegacyRulesNotificationParams = {
      ruleAlertId: '123',
    };

    expect(
      legacyInjectReferences({
        logger,
        params,
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], id: '456' }],
      })
    ).toEqual<FuncReturn>({
      ruleAlertId: '456',
    });
  });

  test('It returns params with an added ruleAlertId if the ruleAlertId is missing due to migration bugs', () => {
    const params = {} as LegacyRulesNotificationParams;

    expect(
      legacyInjectReferences({
        logger,
        params,
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], id: '456' }],
      })
    ).toEqual<FuncReturn>({
      ruleAlertId: '456',
    });
  });
});
