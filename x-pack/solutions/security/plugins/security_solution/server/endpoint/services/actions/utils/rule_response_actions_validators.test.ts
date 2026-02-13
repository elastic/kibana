/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../../mocks';
import type {
  ResponseAction,
  RuleResponseAction,
} from '../../../../../common/api/detection_engine';
import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { ValidateRuleResponseActionsOptions } from './rule_response_actions_validators';
import {
  validateRuleImportResponseActions,
  validateRuleResponseActions,
} from './rule_response_actions_validators';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';
import { getRuleMock } from '../../../../lib/detection_engine/routes/__mocks__/request_responses';
import type { RuleAlertType } from '../../../../lib/detection_engine/rule_schema';
import { getQueryRuleParams } from '../../../../lib/detection_engine/rule_schema/model/rule_schemas.mock';
import type { EnabledAutomatedResponseActionsCommands } from '../../../../../common/endpoint/service/response_actions/constants';

describe('Rules Endpoint response actions validators', () => {
  let endpointService: ReturnType<typeof createMockEndpointAppContextService>;
  let endpointAuthz: EndpointAuthz;
  let rulePayload: ValidateRuleResponseActionsOptions['rulePayload'];
  let existingRule: RuleAlertType;

  const createRulePayloadResponseActionMock = (
    overrides: DeepPartial<ResponseAction> = {}
  ): ResponseAction => {
    return merge(
      {
        action_type_id: '.endpoint',
        params: {
          command: 'isolate',
          config: undefined,
        },
      },
      overrides as ResponseAction
    );
  };

  const createExistingRuleResponseActionMock = (): RuleResponseAction => {
    return {
      actionTypeId: '.endpoint',
      params: {
        command: 'isolate',
        config: undefined,
      },
    } as RuleResponseAction;
  };

  beforeEach(async () => {
    endpointService = createMockEndpointAppContextService();
    endpointAuthz = await endpointService.getEndpointAuthz(httpServerMock.createKibanaRequest());
    rulePayload = { response_actions: [createRulePayloadResponseActionMock()] };
    existingRule = getRuleMock(getQueryRuleParams());
  });

  describe('validateRuleResponseActions()', () => {
    let options: ValidateRuleResponseActionsOptions;

    beforeEach(() => {
      options = {
        rulePayload,
        endpointService,
        endpointAuthz,
        spaceId: 'foo',
      };
    });

    it('should succeed when rule payload has no actions and there is no existing rule', async () => {
      options.rulePayload = {};

      await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
    });

    it('should succeed when both rule payload and existing rule have no actions', async () => {
      existingRule.params.responseActions = [];
      options.existingRule = existingRule;
      options.rulePayload = {};

      await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
    });

    it('should only validate .endpoint response actions', async () => {
      endpointAuthz.canIsolateHost = false;
      rulePayload.response_actions = [
        { action_type_id: '.osquery', params: {} },
        createRulePayloadResponseActionMock(),
      ];

      await expect(validateRuleResponseActions(options)).rejects.toThrow(
        'User is not authorized to create/update isolate response action'
      );
    });

    interface AuthzTestCase {
      actionName: EnabledAutomatedResponseActionsCommands;
      permission: keyof EndpointAuthz;
      responseAction: ResponseAction;
    }
    const getAuthzTests = (): AuthzTestCase[] => [
      {
        actionName: 'isolate',
        permission: 'canIsolateHost',
        responseAction: createRulePayloadResponseActionMock({ params: { command: 'isolate' } }),
      },
      {
        actionName: 'kill-process',
        permission: 'canKillProcess',
        responseAction: createRulePayloadResponseActionMock({
          params: { command: 'kill-process', config: { overwrite: true } },
        }),
      },
      {
        actionName: 'suspend-process',
        permission: 'canSuspendProcess',
        responseAction: createRulePayloadResponseActionMock({
          params: { command: 'suspend-process', config: { overwrite: true } },
        }),
      },
    ];

    it.each(getAuthzTests())(
      `should error if user does not have authz to $actionName response action`,
      async ({ actionName, responseAction, permission }) => {
        rulePayload.response_actions = [responseAction];
        endpointAuthz[permission as keyof EndpointAuthz] = false;

        await expect(validateRuleResponseActions(options)).rejects.toThrow(
          `User is not authorized to create/update ${actionName} response action`
        );
      }
    );

    it.each(getAuthzTests())(
      `should NOT error if user has authz to $actionName response action`,
      async ({ responseAction, permission }) => {
        rulePayload.response_actions = [responseAction];
        endpointAuthz[permission as keyof EndpointAuthz] = true;

        await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
      }
    );

    it('should succeed if response actions have not been changed between payload and existing rule and user has no Authz', async () => {
      endpointAuthz.canIsolateHost = false;
      options.existingRule = existingRule;
      existingRule.params.responseActions = [createExistingRuleResponseActionMock()];

      await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
    });

    it('should error if user has no authz and is updating existing rule', async () => {
      rulePayload.response_actions = [];
      existingRule.params.responseActions = [createExistingRuleResponseActionMock()];
      options.existingRule = existingRule;
      endpointAuthz.canIsolateHost = false;

      await expect(validateRuleResponseActions(options)).rejects.toThrow(
        'User is not authorized to create/update isolate response action'
      );
    });

    describe('and response action is kill/suspend process', () => {
      it('should error if `field` is defined but `overwrite` is `true`', async () => {
        rulePayload.response_actions = [
          createRulePayloadResponseActionMock({
            params: { command: 'kill-process', config: { field: 'foo', overwrite: true } },
          }),
        ];

        await expect(validateRuleResponseActions(options)).rejects.toThrow(
          "Invalid [kill-process] response action configuration: 'field' is not allowed when 'overwrite' is 'true'"
        );
      });

      it('should error if `overwrite` is `false` and no `field` is provided', async () => {
        rulePayload.response_actions = [
          createRulePayloadResponseActionMock({
            params: { command: 'kill-process', config: { overwrite: false } },
          }),
        ];

        await expect(validateRuleResponseActions(options)).rejects.toThrow(
          "Invalid [kill-process] response action configuration: 'field' is required when 'overwrite' is 'false'"
        );
      });
    });
  });

  describe('validateRuleImportResponseActions()', () => {
    it('should return list of valid rules and list of errors', async () => {
      endpointAuthz.canIsolateHost = false;

      const rulesToImport = [
        // Valid rule with multiple actions
        {
          response_actions: [
            createRulePayloadResponseActionMock({
              params: { command: 'suspend-process', config: { overwrite: true } },
            }),
            createRulePayloadResponseActionMock({
              params: { command: 'kill-process', config: { overwrite: true } },
            }),
          ],
          id: 'foo',
          rule_id: 'bar',
        },
        // Invalid rule: kill-process action with no `field` defined
        {
          response_actions: [
            createRulePayloadResponseActionMock({
              params: { command: 'kill-process', config: { overwrite: false, field: '' } },
            }),
          ],
          id: 'foo2',
          rule_id: 'bar2',
        },
        // Invalid rule: user has no Isolate permission
        {
          response_actions: [createRulePayloadResponseActionMock()],
          id: 'foo3',
          rule_id: 'foo3',
        },
      ];

      await expect(
        validateRuleImportResponseActions({
          endpointAuthz,
          endpointService,
          spaceId: 'foo',
          rulesToImport,
        })
      ).resolves.toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Object {
              "error": Object {
                "message": "Invalid [kill-process] response action configuration: 'field' is required when 'overwrite' is 'false'",
                "status_code": 400,
              },
              "id": "foo2",
              "rule_id": "bar2",
            },
            Object {
              "error": Object {
                "message": "User is not authorized to create/update isolate response action",
                "status_code": 403,
              },
              "id": "foo3",
              "rule_id": "foo3",
            },
          ],
          "valid": Array [
            Object {
              "id": "foo",
              "response_actions": Array [
                Object {
                  "action_type_id": ".endpoint",
                  "params": Object {
                    "command": "suspend-process",
                    "config": Object {
                      "overwrite": true,
                    },
                  },
                },
                Object {
                  "action_type_id": ".endpoint",
                  "params": Object {
                    "command": "kill-process",
                    "config": Object {
                      "overwrite": true,
                    },
                  },
                },
              ],
              "rule_id": "bar",
            },
          ],
        }
      `);
    });
  });
});
