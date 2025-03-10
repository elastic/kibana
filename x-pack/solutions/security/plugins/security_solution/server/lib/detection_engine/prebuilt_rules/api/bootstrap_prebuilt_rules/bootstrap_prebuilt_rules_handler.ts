/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { BootstrapPrebuiltRulesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import {
  installEndpointPackage,
  installPrebuiltRulesPackage,
} from '../install_prebuilt_rules_and_timelines/install_prebuilt_rules_package';

export const bootstrapPrebuiltRulesHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  _: KibanaRequest,
  response: KibanaResponseFactory
): Promise<IKibanaResponse<BootstrapPrebuiltRulesResponse>> => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['securitySolution']);
    const securityContext = ctx.securitySolution;
    const config = securityContext.getConfig();

    const prebuiltRulesResult = await installPrebuiltRulesPackage(config, securityContext);
    const endpointResult = await installEndpointPackage(config, securityContext);

    const responseBody: BootstrapPrebuiltRulesResponse = {
      packages: [
        {
          name: prebuiltRulesResult.package.name,
          version: prebuiltRulesResult.package.version,
          status: prebuiltRulesResult.status,
        },
        {
          name: endpointResult.package.name,
          version: endpointResult.package.version,
          status: endpointResult.status,
        },
      ],
    };

    return response.ok({
      body: responseBody,
    });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
