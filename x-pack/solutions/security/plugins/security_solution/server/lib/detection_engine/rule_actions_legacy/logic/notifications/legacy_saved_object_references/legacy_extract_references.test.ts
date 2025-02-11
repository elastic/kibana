/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesNotificationParams } from '../legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyExtractReferences } from './legacy_extract_references';

describe('legacy_extract_references', () => {
  type FuncReturn = ReturnType<typeof legacyExtractReferences>;
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('It returns the references extracted as saved object references', () => {
    const params: LegacyRulesNotificationParams = {
      ruleAlertId: '123',
    };
    expect(
      legacyExtractReferences({
        logger,
        params,
      })
    ).toEqual<FuncReturn>({
      params,
      references: [
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
      ],
    });
  });

  test('It returns the empty references array if the ruleAlertId is missing for any particular unusual reason', () => {
    const params = {};
    expect(
      legacyExtractReferences({
        logger,
        params: params as LegacyRulesNotificationParams,
      })
    ).toEqual<FuncReturn>({
      params: params as LegacyRulesNotificationParams,
      references: [],
    });
  });
});
