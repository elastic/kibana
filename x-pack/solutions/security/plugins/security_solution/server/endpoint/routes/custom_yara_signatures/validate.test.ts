/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Mutable } from 'utility-types';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { ExperimentalFeatures } from '../../../../common';
import type { ValidateCustomYaraSignatureRequestBody } from '../../../../common/api/endpoint/custom_yara_signatures';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { YaraValidateResult } from '../../lib/libyara';
import {
  validateCustomYaraRule,
  YARA_ENGINE_INTERNAL_ERROR_MESSAGE,
} from '../../lib/custom_yara_signatures';
import { EndpointAuthorizationError, EndpointHttpError } from '../../errors';
import { registerCustomYaraSignaturesRoutes } from '.';
import { registerValidateCustomYaraSignatureRoute } from './validate';

jest.mock('../../lib/custom_yara_signatures', () => ({
  ...jest.requireActual('../../lib/custom_yara_signatures'),
  validateCustomYaraRule: jest.fn(),
}));

const mockValidateCustomYaraRule = validateCustomYaraRule as jest.MockedFunction<
  typeof validateCustomYaraRule
>;

const validRequestBody: ValidateCustomYaraSignatureRequestBody = {
  yara_rule: 'rule rule1 { condition: true }',
  os_types: [OperatingSystem.WINDOWS],
};

const libyaraResult = (overrides: Partial<YaraValidateResult> = {}): YaraValidateResult => ({
  errors: [],
  warnings: [],
  errorCount: 0,
  warningCount: 0,
  rules: [{ identifier: 'rule1', meta: {}, duplicateMeta: [] }],
  ...overrides,
});

describe('POST: validate custom YARA signature', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<
      undefined,
      undefined,
      ValidateCustomYaraSignatureRequestBody
    >['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    undefined,
    undefined,
    ValidateCustomYaraSignatureRequestBody
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    undefined,
    undefined,
    ValidateCustomYaraSignatureRequestBody
  >['httpResponseMock'];

  const getRoute = () =>
    apiTestSetup.getRegisteredVersionedRoute('post', CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE, '1');

  const invokeRoute = () =>
    getRoute().routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

  beforeEach(() => {
    apiTestSetup = createHttpApiTestSetupMock<
      undefined,
      undefined,
      ValidateCustomYaraSignatureRequestBody
    >();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      body: validRequestBody,
    });

    mockValidateCustomYaraRule.mockReset();
    mockValidateCustomYaraRule.mockResolvedValue(libyaraResult());
  });

  describe('registerCustomYaraSignaturesRoutes()', () => {
    it('does not register the route when the feature flag is off', () => {
      registerCustomYaraSignaturesRoutes(
        apiTestSetup.routerMock,
        apiTestSetup.endpointAppContextMock
      );

      expect(getRoute).toThrow();
    });

    it('registers the route when the feature flag is on', () => {
      (
        apiTestSetup.endpointAppContextMock.experimentalFeatures as Mutable<ExperimentalFeatures>
      ).customYaraSignaturesEnabled = true;

      registerCustomYaraSignaturesRoutes(
        apiTestSetup.routerMock,
        apiTestSetup.endpointAppContextMock
      );

      expect(getRoute()).toBeDefined();
    });
  });

  describe('registerValidateCustomYaraSignatureRoute()', () => {
    beforeEach(() => {
      registerValidateCustomYaraSignatureRoute(
        apiTestSetup.routerMock,
        apiTestSetup.endpointAppContextMock
      );
    });

    it('should register the route', () => {
      const registeredRoute = getRoute();

      expect(registeredRoute).toBeDefined();
      expect(registeredRoute.routeConfig.access).toBe('internal');
    });

    it('should error if user has no write authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canWriteCustomYaraSignatures: false,
          canReadCustomYaraSignatures: true,
        })
      );

      await invokeRoute();

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
      expect(mockValidateCustomYaraRule).not.toHaveBeenCalled();
    });

    describe('route handler', () => {
      it('should call validateCustomYaraRule with yara_rule and os_types', async () => {
        await invokeRoute();

        expect(mockValidateCustomYaraRule).toHaveBeenCalledWith(
          validRequestBody.yara_rule,
          validRequestBody.os_types
        );
      });

      it('should respond with mapped diagnostics and omit compiled rules', async () => {
        await invokeRoute();

        expect(httpResponseMock.ok).toHaveBeenCalledWith({
          body: {
            errors: [],
            warnings: [],
            error_count: 0,
            warning_count: 0,
          },
        });
      });

      it('should return 200 with errors when the rule is invalid', async () => {
        const errors = [{ severity: 'error' as const, message: 'syntax error', line: 2 }];
        mockValidateCustomYaraRule.mockResolvedValue(
          libyaraResult({ errors, errorCount: 1, rules: [] })
        );

        await invokeRoute();

        expect(httpResponseMock.ok).toHaveBeenCalledWith({
          body: {
            errors,
            warnings: [],
            error_count: 1,
            warning_count: 0,
          },
        });
      });

      it('should return 200 with warnings when there are no errors', async () => {
        const warnings = [
          { severity: 'warning' as const, message: 'may slow down scanning', line: 1 },
        ];
        mockValidateCustomYaraRule.mockResolvedValue(libyaraResult({ warnings, warningCount: 1 }));

        await invokeRoute();

        expect(httpResponseMock.ok).toHaveBeenCalledWith({
          body: {
            errors: [],
            warnings,
            error_count: 0,
            warning_count: 1,
          },
        });
      });

      it('should respond with a safe 500 when the YARA engine fails', async () => {
        const engineError = new WebAssembly.RuntimeError('memory access out of bounds');
        mockValidateCustomYaraRule.mockRejectedValue(engineError);

        await invokeRoute();

        expect(httpResponseMock.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: expect.any(EndpointHttpError),
        });

        const customErrorBody = httpResponseMock.customError.mock.calls[0]?.[0].body;
        expect(customErrorBody).toBeInstanceOf(EndpointHttpError);
        if (!(customErrorBody instanceof EndpointHttpError)) {
          throw new Error('expected EndpointHttpError');
        }
        expect(customErrorBody.message).toBe(YARA_ENGINE_INTERNAL_ERROR_MESSAGE);
        expect(customErrorBody.message).not.toContain('memory access out of bounds');

        const logger = (
          apiTestSetup.endpointAppContextMock.service.createLogger as jest.Mock
        ).mock.results.at(-1)?.value;
        expect(logger.error).toHaveBeenCalledWith(engineError);
      });
    });
  });
});
