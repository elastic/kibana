/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import type { RuleResponseAction } from '../../../../../common/api/detection_engine';
import { getQueryRuleParams } from '../../rule_schema/model/rule_schemas.mock';
import type { RuleParams } from '../../rule_schema';
import { createResponseActionsParamsAuthorizer } from './authorize_rule_response_actions';

const isolateResponseAction = (): RuleResponseAction =>
  ({
    actionTypeId: '.endpoint',
    params: { command: 'isolate', comment: 'test' },
  } as RuleResponseAction);

const paramsWithResponseActions = (responseActions?: RuleResponseAction[]): RuleParams =>
  ({ ...getQueryRuleParams(), responseActions } as RuleParams);

describe('createResponseActionsParamsAuthorizer', () => {
  let endpointAppContextService: ReturnType<typeof createMockEndpointAppContextService>;
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    endpointAppContextService = createMockEndpointAppContextService();
  });

  it('resolves when neither new nor previous params have response actions', async () => {
    const authorizer = createResponseActionsParamsAuthorizer({ endpointAppContextService });

    await expect(
      authorizer.authorize(paramsWithResponseActions(), { request })
    ).resolves.toBeUndefined();
  });

  it('resolves when the user is authorized for the added response action', async () => {
    endpointAppContextService.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canIsolateHost: true })
    );
    const authorizer = createResponseActionsParamsAuthorizer({ endpointAppContextService });

    await expect(
      authorizer.authorize(paramsWithResponseActions([isolateResponseAction()]), { request })
    ).resolves.toBeUndefined();
  });

  it('throws a 403 Boom error when the user lacks privileges for the added response action', async () => {
    endpointAppContextService.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canIsolateHost: false })
    );
    const authorizer = createResponseActionsParamsAuthorizer({ endpointAppContextService });

    const error = await authorizer
      .authorize(paramsWithResponseActions([isolateResponseAction()]), { request })
      .catch((e) => e);

    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output.statusCode).toBe(403);
  });

  it('does not re-authorize a response action that is unchanged from the previous params', async () => {
    // User is NOT authorized, but since the response action is unchanged the
    // authorizer must not block the write (mirrors the DE routes' behavior of
    // only validating changed response actions). This also proves the internal
    // camelCase params are correctly reconciled with the previous params.
    endpointAppContextService.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canIsolateHost: false })
    );
    const authorizer = createResponseActionsParamsAuthorizer({ endpointAppContextService });
    const responseActions = [isolateResponseAction()];

    await expect(
      authorizer.authorize(paramsWithResponseActions(responseActions), {
        request,
        previousParams: paramsWithResponseActions(responseActions),
      })
    ).resolves.toBeUndefined();
  });

  it('uses the request-scoped osquery authz checker for osquery response actions', async () => {
    const osqueryCheck = jest.fn().mockResolvedValue(undefined);
    const getOsqueryResponseActionsAuthzChecker = jest.fn().mockReturnValue(osqueryCheck);
    const authorizer = createResponseActionsParamsAuthorizer({
      endpointAppContextService,
      getOsqueryResponseActionsAuthzChecker,
    });

    const osqueryAction = {
      actionTypeId: '.osquery',
      params: { savedQueryId: 'saved-query-1' },
    } as RuleResponseAction;

    await authorizer.authorize(paramsWithResponseActions([osqueryAction]), { request });

    expect(getOsqueryResponseActionsAuthzChecker).toHaveBeenCalledWith(request);
    expect(osqueryCheck).toHaveBeenCalledWith(
      expect.objectContaining({ saved_query_id: 'saved-query-1' })
    );
  });

  const osqueryAction = () =>
    ({ actionTypeId: '.osquery', params: { savedQueryId: 'q' } } as RuleResponseAction);

  it('preserves the status code of a validator error thrown from a different class', async () => {
    // Simulates osquery's own CustomHttpRequestError: a non-Boom error carrying a
    // numeric `statusCode` that is NOT an instanceof the security_solution class.
    const osqueryError = Object.assign(new Error('not authorized for osquery'), {
      statusCode: 403,
    });
    const authorizer = createResponseActionsParamsAuthorizer({
      endpointAppContextService,
      getOsqueryResponseActionsAuthzChecker: () => jest.fn().mockRejectedValue(osqueryError),
    });

    const error = await authorizer
      .authorize(paramsWithResponseActions([osqueryAction()]), { request })
      .catch((e) => e);

    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output.statusCode).toBe(403);
    expect(error.message).toBe('not authorized for osquery');
  });

  it('defaults to a 400 status code for a thrown error without a status code', async () => {
    const authorizer = createResponseActionsParamsAuthorizer({
      endpointAppContextService,
      getOsqueryResponseActionsAuthzChecker: () => jest.fn().mockRejectedValue(new Error('boom')),
    });

    const error = await authorizer
      .authorize(paramsWithResponseActions([osqueryAction()]), { request })
      .catch((e) => e);

    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output.statusCode).toBe(400);
  });
});
