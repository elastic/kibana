/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { DETECTION_ENGINE_RULES_PREVIEW } from '../../../../../../common/constants';
import { getCreateRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import {
  OSQUERY_QUERY_OVER_LIMIT_FIELD_PATH,
  OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH,
  getOverLimitOsqueryResponseActionMock,
} from '../../../../../../common/api/detection_engine/model/rule_response_actions/response_actions.mock';
import { configMock, requestMock, serverMock } from '../../../routes/__mocks__';
import type { StartPlugins, SetupPlugins } from '../../../../../plugin';
import type { CreateSecurityRuleTypeWrapperProps } from '../../../rule_types/types';
import { previewRulesRoute } from './route';

describe('Preview rules route', () => {
  let server: ReturnType<typeof serverMock.create>;

  beforeEach(() => {
    server = serverMock.create();

    previewRulesRoute(
      server.router,
      configMock.createDefault(),
      {} as SetupPlugins['ml'],
      {} as SetupPlugins['security'],
      {} as CreateSecurityRuleTypeWrapperProps,
      {} as IRuleDataClient,
      jest.fn() as unknown as StartServicesAccessor<StartPlugins>,
      loggerMock.create(),
      false
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('request validation', () => {
    test('rejects over-limit osquery response action query', () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_PREVIEW,
        body: {
          ...getCreateRulesSchemaMock(),
          invocationCount: 1,
          timeframeEnd: new Date().toISOString(),
          response_actions: [getOverLimitOsqueryResponseActionMock()],
        },
        query: {},
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalled();
      const [[message]] = result.badRequest.mock.calls;

      expect(message).toEqual(expect.stringContaining(OSQUERY_QUERY_OVER_LIMIT_FIELD_PATH));
      expect(message).toEqual(
        expect.stringContaining(String(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH))
      );
    });
  });
});
