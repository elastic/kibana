/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  IKibanaResponse,
} from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import { ErrorCode } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { isEnterprise, LICENSE_REQUIRED_MESSAGE } from '../lib/license';

export type GetLicense = () => Promise<ILicense>;

/**
 * Gates a route on an active Enterprise licence. Below it the route answers 403 with
 * `attributes.code: LICENSE_REQUIRED`, unless `onInsufficient` supplies another response (the status
 * route answers 200 so the UI can render an upsell instead of an error).
 */
export const withLicense =
  <Params, Query, Body>(
    getLicense: GetLicense,
    handler: RequestHandler<Params, Query, Body, RequestHandlerContext>,
    onInsufficient?: (response: KibanaResponseFactory) => IKibanaResponse
  ): RequestHandler<Params, Query, Body, RequestHandlerContext> =>
  async (context, request, response) => {
    if (!isEnterprise(await getLicense())) {
      return (
        onInsufficient?.(response) ??
        response.forbidden({
          body: {
            message: LICENSE_REQUIRED_MESSAGE,
            attributes: { code: ErrorCode.LicenseRequired },
          },
        })
      );
    }
    return handler(context, request, response);
  };
