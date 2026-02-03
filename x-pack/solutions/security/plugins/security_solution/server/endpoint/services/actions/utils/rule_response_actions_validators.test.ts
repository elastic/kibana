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
import { validateRuleResponseActions } from './rule_response_actions_validators';
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

    it('should succeed if response actions have not been changed between payload and existing rule', async () => {
      options.existingRule = existingRule;
      existingRule.params.responseActions = [createExistingRuleResponseActionMock()];

      await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
    });

    it('should only validate .endpoint response actions', async () => {
      rulePayload.response_actions!.push({ action_type_id: '.osquery', params: {} });

      await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
    });

    interface AuthzTestCase {
      actionName: EnabledAutomatedResponseActionsCommands;
      permission: keyof EndpointAuthz;
      responseAction: ResponseAction;
    }
    const authzTests: AuthzTestCase[] = [
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

    it.each(authzTests)(
      `should error if user does not have authz to $actionName response action`,
      async ({ actionName, responseAction, permission }) => {
        rulePayload.response_actions = [responseAction];
        endpointAuthz[permission as keyof EndpointAuthz] = false;

        await expect(validateRuleResponseActions(options)).rejects.toThrow(
          `User is not authorized to create/update ${actionName} response action`
        );
      }
    );

    it.each(authzTests)(
      `should NOT error if user has authz to $actionName response action`,
      async ({ responseAction, permission }) => {
        rulePayload.response_actions = [responseAction];
        endpointAuthz[permission as keyof EndpointAuthz] = true;

        await expect(validateRuleResponseActions(options)).resolves.toBeUndefined();
      }
    );

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
    // TODO: implement
  });
});
